import assert from 'node:assert/strict';
import { getDeploymentInfo } from '../src/server/deploymentInfo';

const startedAt = '2026-11-03T10:00:00.000Z';
assert.deepEqual(
  getDeploymentInfo({
    FLY_APP_NAME: 'shorts-prod',
    FLY_IMAGE_REF: 'registry.fly.io/shorts-prod:deployment-123@sha256:abcdef1234567890',
    FLY_MACHINE_ID: 'machine-987654321'
  }, startedAt),
  {
    appName: 'shorts-prod',
    imageRef: 'registry.fly.io/shorts-prod:deployment-123@sha256:abcdef1234567890',
    machineId: 'machine-987654321',
    startedAt
  }
);
assert.deepEqual(
  getDeploymentInfo({ FLY_APP_NAME: '  ', FLY_IMAGE_REF: '', FLY_MACHINE_ID: undefined }, startedAt),
  { appName: null, imageRef: null, machineId: null, startedAt },
  'local environments without Fly metadata retain a safe timestamp fallback'
);

console.log('Deployment info tests passed');
