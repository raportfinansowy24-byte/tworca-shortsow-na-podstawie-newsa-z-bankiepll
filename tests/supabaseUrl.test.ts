import assert from 'node:assert/strict';
import { normalizeSupabaseProjectUrl } from '../src/server/supabaseUrl';

assert.equal(normalizeSupabaseProjectUrl('https://project.supabase.co'), 'https://project.supabase.co');
assert.equal(normalizeSupabaseProjectUrl('https://project.supabase.co/'), 'https://project.supabase.co');
assert.equal(normalizeSupabaseProjectUrl('https://project.supabase.co/rest/v1/'), 'https://project.supabase.co');
assert.equal(normalizeSupabaseProjectUrl('https://project.supabase.co/rest/v1'), 'https://project.supabase.co');
assert.throws(() => normalizeSupabaseProjectUrl('http://project.supabase.co'), /HTTPS/);

console.log('Supabase URL tests passed');
