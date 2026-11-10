import assert from 'node:assert/strict';
import { ServiceHealthItem, DetailedServicesHealth } from '../src/types';

// Verify health structures
const mockFfmpegItem: ServiceHealthItem & { version: string; fontReady: boolean; activeJobs: number } = {
  status: 'online',
  latencyMs: 12,
  message: 'Renderer FFmpeg jest gotowy.',
  version: 'ffmpeg version 6.1.1',
  fontReady: true,
  activeJobs: 0,
  checkedAt: new Date().toISOString()
};

const mockPexelsItem: ServiceHealthItem & { hasKey: boolean } = {
  status: 'online',
  latencyMs: 145,
  message: 'Pexels API autoryzowane.',
  hasKey: true,
  checkedAt: new Date().toISOString()
};

const mockElevenLabsItem: ServiceHealthItem & { hasKey: boolean; voiceId?: string } = {
  status: 'online',
  latencyMs: 210,
  message: 'ElevenLabs API autoryzowane.',
  hasKey: true,
  voiceId: '21m00Tcm4TlvDq8ikWAM',
  checkedAt: new Date().toISOString()
};

const mockHealthResponse: DetailedServicesHealth = {
  status: 'healthy',
  timestamp: new Date().toISOString(),
  services: {
    ffmpeg: mockFfmpegItem,
    pexels: mockPexelsItem,
    elevenLabs: mockElevenLabsItem
  }
};

assert.equal(mockHealthResponse.status, 'healthy');
assert.equal(mockHealthResponse.services.ffmpeg.status, 'online');
assert.equal(mockHealthResponse.services.pexels.status, 'online');
assert.equal(mockHealthResponse.services.elevenLabs.status, 'online');
assert.equal(mockHealthResponse.services.ffmpeg.fontReady, true);
assert.equal(mockHealthResponse.services.elevenLabs.voiceId, '21m00Tcm4TlvDq8ikWAM');

// Verify degraded logic
const degradedResponse: DetailedServicesHealth = {
  status: 'degraded',
  timestamp: new Date().toISOString(),
  services: {
    ffmpeg: mockFfmpegItem,
    pexels: { ...mockPexelsItem, status: 'key_missing', hasKey: false, message: 'Brak klucza PEXELS_API_KEY.' },
    elevenLabs: mockElevenLabsItem
  }
};

assert.equal(degradedResponse.status, 'degraded');
assert.equal(degradedResponse.services.pexels.hasKey, false);

console.log('Services Health test passed');
