export function normalizeSupabaseProjectUrl(input: string): string {
  const url = new URL(input.trim());
  if (url.protocol !== 'https:' || !url.hostname) {
    throw new Error('SUPABASE_URL musi być pełnym adresem HTTPS projektu Supabase.');
  }
  url.search = '';
  url.hash = '';
  url.pathname = url.pathname.replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
  return url.toString().replace(/\/+$/, '');
}
