import unittest

from scripts.render_offline_short import RenderError, validate_production_manifest, wrap_screen_text


class OfflineRendererValidationTests(unittest.TestCase):
    def setUp(self):
        self.manifest = {
            "article": {
                "title": "Przykładowy artykuł",
                "source_url": "https://www.bankier.pl/wiadomosc/example.html",
                "published": "2026-10-15T08:00:00+02:00",
                "verified_at": "2026-10-15T09:00:00+02:00",
                "fact_check_status": "verified",
            },
            "scenes": [
                {"role": "HOOK", "text": "Krótki, konkretny hook"},
                {"role": "FAKT", "text": "Potwierdzony fakt ze źródła"},
                {"role": "KONTEKST", "text": "Kontekst bez dopisywania danych"},
                {"role": "CTA", "text": "Sprawdź źródło i pełny kontekst"},
            ],
        }

    def test_accepts_verified_bankier_story_with_four_scenes(self):
        result = validate_production_manifest(self.manifest)
        self.assertEqual([scene["role"] for scene in result["scenes"]], ["HOOK", "FAKT", "KONTEKST", "CTA"])

    def test_rejects_unverified_article(self):
        data = {**self.manifest, "article": {**self.manifest["article"], "fact_check_status": "needs_fact_check"}}
        with self.assertRaisesRegex(RenderError, "fact_check_status"):
            validate_production_manifest(data)

    def test_rejects_non_bankier_domain(self):
        data = {**self.manifest, "article": {**self.manifest["article"], "source_url": "https://bankier.pl.attacker.example/story"}}
        with self.assertRaisesRegex(RenderError, "domenie bankier.pl"):
            validate_production_manifest(data)

    def test_rejects_wrong_scene_count(self):
        data = {**self.manifest, "scenes": self.manifest["scenes"][:3]}
        with self.assertRaisesRegex(RenderError, "dokładnie 4 sceny"):
            validate_production_manifest(data)

    def test_rejects_scene_role_out_of_order(self):
        scenes = [dict(scene) for scene in self.manifest["scenes"]]
        scenes[1]["role"] = "CTA"
        data = {**self.manifest, "scenes": scenes}
        with self.assertRaisesRegex(RenderError, "role=FAKT"):
            validate_production_manifest(data)

    def test_wrap_rejects_unreadably_long_screen_text(self):
        with self.assertRaisesRegex(RenderError, "Skróć copy"):
            wrap_screen_text("słowo " * 30)

    def test_wrap_preserves_polish_characters(self):
        self.assertIn("ł", wrap_screen_text("Płynność i oszczędności"))


if __name__ == "__main__":
    unittest.main()
