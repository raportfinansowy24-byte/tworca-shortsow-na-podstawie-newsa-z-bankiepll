import fs from 'fs/promises';
import path from 'path';

export interface PostizPublishInput {
  videoPath: string;
  title: string;
  description?: string;
  articleUrl?: string;
}

export interface PostizPublishResult {
  configured: boolean;
  published: boolean;
  reason?: string;
  postIds?: string[];
}

function getPostizConfig() {
  const apiKey = (process.env.POSTIZ_API_KEY || '').trim();
  const baseUrl = (process.env.POSTIZ_API_URL || 'https://api.postiz.com/public/v1').trim().replace(/\/+$/, '');
  const integrations = (process.env.POSTIZ_INTEGRATIONS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const separator = item.indexOf(':');
      return separator > 0
        ? { provider: item.slice(0, separator).trim().toLowerCase(), id: item.slice(separator + 1).trim() }
        : { provider: '', id: item };
    })
    .filter((item) => item.id);
  return { apiKey, baseUrl, integrations };
}

/**
 * Publishes a Telegram-approved MP4 through Postiz.
 * Disabled unless POSTIZ_AUTO_PUBLISH=true, so adding credentials alone cannot
 * unexpectedly publish public content.
 *
 * POSTIZ_INTEGRATIONS format: provider:id, e.g. tiktok:INTEGRATION_ID,youtube:OTHER_ID
 */
export async function publishApprovedShortToPostiz(input: PostizPublishInput): Promise<PostizPublishResult> {
  const config = getPostizConfig();
  if (process.env.POSTIZ_AUTO_PUBLISH !== 'true') {
    return { configured: Boolean(config.apiKey && config.integrations.length), published: false, reason: 'auto_publish_disabled' };
  }
  if (!config.apiKey || config.integrations.length === 0) {
    return { configured: false, published: false, reason: 'missing_postiz_credentials_or_integrations' };
  }
  if (config.integrations.some((integration) => !integration.provider)) {
    return { configured: false, published: false, reason: 'integration_must_use_provider:id_format' };
  }

  const video = await fs.readFile(input.videoPath);
  const form = new FormData();
  form.append('file', new Blob([video], { type: 'video/mp4' }), path.basename(input.videoPath));
  const uploadResponse = await fetch(`${config.baseUrl}/upload`, {
    method: 'POST',
    headers: { Authorization: config.apiKey },
    body: form,
    signal: AbortSignal.timeout(120_000)
  });
  const uploadBody = await uploadResponse.text();
  if (!uploadResponse.ok) {
    throw new Error(`Postiz media upload failed (HTTP ${uploadResponse.status}): ${uploadBody.slice(0, 500)}`);
  }
  let media: { id?: string; path?: string };
  try {
    media = JSON.parse(uploadBody) as { id?: string; path?: string };
  } catch {
    throw new Error('Postiz media upload returned invalid JSON.');
  }
  if (!media.path) throw new Error('Postiz media upload response did not include a media path.');

  const content = [input.title.trim(), input.description?.trim(), input.articleUrl?.trim()]
    .filter(Boolean)
    .join('\n\n');
  const posts = config.integrations.map((integration) => ({
    integration: { id: integration.id },
    value: [{ content, image: [{ id: media.id, path: media.path }] }],
    settings: { __type: integration.provider }
  }));

  const response = await fetch(`${config.baseUrl}/posts`, {
    method: 'POST',
    headers: { Authorization: config.apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'now', date: new Date().toISOString(), posts }),
    signal: AbortSignal.timeout(60_000)
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Postiz post creation failed (HTTP ${response.status}): ${body.slice(0, 500)}`);
  }
  let responseData: unknown;
  try { responseData = JSON.parse(body); } catch { responseData = body; }
  const ids = Array.isArray(responseData)
    ? responseData.map((item) => item && typeof item === 'object' ? String((item as { id?: unknown }).id || '') : '').filter(Boolean)
    : responseData && typeof responseData === 'object' && Array.isArray((responseData as { posts?: unknown[] }).posts)
      ? ((responseData as { posts: unknown[] }).posts).map((item) => item && typeof item === 'object' ? String((item as { id?: unknown }).id || '') : '').filter(Boolean)
      : [];
  return { configured: true, published: true, postIds: ids };
}
