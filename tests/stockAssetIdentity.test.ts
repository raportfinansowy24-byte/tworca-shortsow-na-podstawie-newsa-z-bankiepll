import assert from 'node:assert/strict';
import { getCanonicalStockAssetId, hasDuplicateStockAssetIdentities } from '../src/server/stockAssetIdentity';

assert.equal(getCanonicalStockAssetId({ source: 'pexels', pexelsId: 123 }), 'pexels:123');
assert.equal(getCanonicalStockAssetId({ source: 'pixabay', pexelsId: 1_000_000_000_123, pixabayId: 123, stockId: 'pixabay:123' }), 'pixabay:123');
assert.equal(getCanonicalStockAssetId({ source: 'pexels', pexelsId: 123, stockId: 'pixabay:123' }), null);
assert.equal(getCanonicalStockAssetId({ source: 'pixabay', pexelsId: 1_000_000_000_123, pixabayId: 123, stockId: 'pixabay:999' }), null);
assert.equal(getCanonicalStockAssetId({ source: 'pixabay', pexelsId: 123, pixabayId: 123, stockId: 'pixabay:123' }), null, 'legacy ID musi odpowiadać offsetowi Pixabay');
assert.equal(getCanonicalStockAssetId({ source: 'pixabay', pexelsId: 1_000_000_000_124, pixabayId: 123, stockId: 'pixabay:123' }), null, 'niezgodny legacy ID jest odrzucany');
assert.equal(getCanonicalStockAssetId({ source: 'other', pexelsId: 123 }), null);
assert.equal(getCanonicalStockAssetId({ source: 'pexels', pexelsId: 0 }), null);
assert.equal(getCanonicalStockAssetId({ source: 'pixabay', pexelsId: 1_000_000_000_123, pixabayId: 0, stockId: 'pixabay:0' }), null);

assert.equal(hasDuplicateStockAssetIdentities([
  { source: 'pexels', pexelsId: 123 },
  { source: 'pixabay', pexelsId: 1_000_000_000_123, pixabayId: 123, stockId: 'pixabay:123' }
]), false, 'identyczne surowe ID u różnych dostawców oznaczają różne materiały');
assert.equal(hasDuplicateStockAssetIdentities([
  { source: 'pexels', pexelsId: 123 },
  { source: 'pexels', pexelsId: 123 }
]), true, 'duplikat tego samego materiału Pexels jest wykrywany');
assert.equal(hasDuplicateStockAssetIdentities([
  { source: 'pixabay', pexelsId: 1_000_000_000_123, pixabayId: 123, stockId: 'pixabay:123' },
  { source: 'pixabay', pexelsId: 1_000_000_000_123, pixabayId: 123, stockId: 'pixabay:123' }
]), true, 'duplikat tego samego materiału Pixabay jest wykrywany');
console.log('Stock asset identity tests passed');
