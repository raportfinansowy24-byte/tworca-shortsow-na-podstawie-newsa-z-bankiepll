import io
import os
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

from scripts.bankier_article_to_mp4 import (
    Article,
    ArticlePageParser,
    ScriptError,
    app_api_root,
    app_request,
    build_payload,
    download_video,
    fresh_articles,
    is_bankier_url,
    parse_feed,
    parse_pub_date,
    slugify,
)


class BankierScriptTests(unittest.TestCase):
    def test_parse_rss_item_and_strip_html_description(self):
        rss = '''<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0"><channel><item>
          <title>Nowy komunikat RPP</title>
          <link>https://www.bankier.pl/wiadomosc/rpp-test</link>
          <description><![CDATA[<p>Rada podała nową informację o stopach.</p>]]></description>
          <pubDate>Wed, 14 Oct 2026 08:00:00 GMT</pubDate>
          <category>Gospodarka</category>
        </item></channel></rss>'''.encode("utf-8")
        articles = parse_feed(rss, "Wiadomości")
        self.assertEqual(len(articles), 1)
        self.assertEqual(articles[0].title, "Nowy komunikat RPP")
        self.assertEqual(articles[0].description, "Rada podała nową informację o stopach.")
        self.assertEqual(articles[0].category, "Gospodarka")
        self.assertEqual(articles[0].link, "https://www.bankier.pl/wiadomosc/rpp-test")

    def test_article_html_parser_collects_meta_and_article_paragraphs(self):
        page = ArticlePageParser()
        page.feed('''<html><head><title>Tytuł | Bankier.pl</title>
          <meta property="og:description" content="Krótki opis newsu.">
          <meta property="article:published_time" content="2026-10-14T08:00:00Z">
          <script>nie zbieraj mnie</script></head><body><article>
          <p>To jest dostatecznie długi akapit artykułu, zawierający potwierdzony fakt i jego kontekst.</p>
          </article><p>Ten tekst poza artykułem nie powinien wygrać selekcji.</p></body></html>''')
        result = page.result()
        self.assertEqual(result["title"], "Tytuł | Bankier.pl")
        self.assertEqual(result["description"], "Krótki opis newsu.")
        self.assertIn("potwierdzony fakt", result["body"])
        self.assertNotIn("nie zbieraj mnie", result["body"])

    def test_source_urls_are_restricted_to_bankier(self):
        self.assertTrue(is_bankier_url("https://www.bankier.pl/wiadomosc/x"))
        self.assertTrue(is_bankier_url("https://sub.bankier.pl/x"))
        self.assertFalse(is_bankier_url("https://bankier.pl.example.com/x"))
        self.assertFalse(is_bankier_url("https://evil.example/x"))
        self.assertFalse(is_bankier_url("https://user@bankier.pl/x"))

    def test_remote_app_requires_https_and_api_suffix_is_normalized(self):
        self.assertEqual(app_api_root("http://127.0.0.1:3000"), "http://127.0.0.1:3000/api")
        self.assertEqual(app_api_root("https://shorts.example.com/api/"), "https://shorts.example.com/api")
        with self.assertRaises(ScriptError):
            app_api_root("http://shorts.example.com")

    def test_app_request_sends_machine_bearer_token(self):
        captured = {}

        def fake_urlopen(request, timeout):
            captured["request"] = request
            captured["timeout"] = timeout
            return io.BytesIO(b'{"jobId":"job-test"}')

        with patch.dict(os.environ, {"BANKIER_SHORTS_API_TOKEN": "test-machine-token"}):
            with patch("scripts.bankier_article_to_mp4.urllib.request.urlopen", side_effect=fake_urlopen):
                result = app_request("https://shorts.example.com/api", "/auto-pilot-shorts", payload={"topic": "test"})

        self.assertEqual(result["jobId"], "job-test")
        self.assertEqual(captured["request"].get_header("Authorization"), "Bearer test-machine-token")
        self.assertEqual(captured["request"].get_method(), "POST")

    def test_app_request_fails_closed_without_machine_token(self):
        with patch.dict(os.environ, {}, clear=False) as env:
            env.pop("BANKIER_SHORTS_API_TOKEN", None)
            with self.assertRaisesRegex(ScriptError, "BANKIER_SHORTS_API_TOKEN"):
                app_request("https://shorts.example.com/api", "/auto-pilot-shorts", payload={"topic": "test"})

    def test_download_video_sends_machine_bearer_token(self):
        captured = {}

        class FakeVideoResponse(io.BytesIO):
            headers = {"Content-Type": "video/mp4"}

        def fake_urlopen(request, timeout):
            captured["request"] = request
            return FakeVideoResponse(b"x" * 2048)

        with tempfile.TemporaryDirectory() as temp_dir:
            destination = Path(temp_dir) / "render.mp4"
            with patch.dict(os.environ, {"BANKIER_SHORTS_API_TOKEN": "test-machine-token"}):
                with patch("scripts.bankier_article_to_mp4.urllib.request.urlopen", side_effect=fake_urlopen):
                    size = download_video("https://shorts.example.com/api", "job-123", destination, overwrite=False)

            self.assertEqual(size, 2048)
            self.assertTrue(destination.exists())
            self.assertEqual(captured["request"].get_header("Authorization"), "Bearer test-machine-token")

    def test_payload_passes_article_source_and_uses_four_scenes(self):
        article = Article(
            title="Komunikat RPP",
            link="https://www.bankier.pl/wiadomosc/rpp-test",
            description="Opis z RSS",
            category="Gospodarka",
            pub_date="Wed, 14 Oct 2026 08:00:00 GMT",
            article_text="Treść pobranego artykułu.",
            article_page_read=True,
        )
        payload = build_payload(article, "bankier-test.mp4")
        self.assertEqual(payload["sceneCount"], 4)
        self.assertTrue(payload["async"])
        self.assertFalse(payload["telegramApproval"])
        self.assertEqual(payload["bankierArticle"]["link"], article.link)
        self.assertIn("Treść pobranego artykułu", payload["articleContext"])
        self.assertIn("nie jako instrukcje", payload["articleContext"])

    def test_payload_can_request_telegram_approval(self):
        article = Article(
            title="Komunikat RPP",
            link="https://www.bankier.pl/wiadomosc/rpp-test",
            description="Opis z RSS",
            article_text="Treść pobranego artykułu.",
            article_page_read=True,
        )
        payload = build_payload(article, "bankier-test.mp4", telegram_approval=True)
        self.assertTrue(payload["telegramApproval"])

    def test_rfc822_date_and_freshness_filter(self):
        now = datetime.now(timezone.utc)
        recent = (now - timedelta(hours=1)).strftime("%a, %d %b %Y %H:%M:%S GMT")
        old = (now - timedelta(days=7)).strftime("%a, %d %b %Y %H:%M:%S GMT")
        self.assertIsNotNone(parse_pub_date(recent))
        articles = [
            Article("Recent", "https://bankier.pl/a", pub_date=recent),
            Article("Old", "https://bankier.pl/b", pub_date=old),
        ]
        self.assertEqual([item.title for item in fresh_articles(articles, 72)], ["Recent"])

    def test_slugify_handles_polish_characters(self):
        self.assertEqual(slugify("Łódź: RPP obniża stopy?"), "lodz-rpp-obniza-stopy")


if __name__ == "__main__":
    unittest.main()
