export interface DeploymentInfo {
  appName: string | null;
  imageRef: string | null;
  machineId: string | null;
  startedAt: string;
}

export function getDeploymentInfo(
  env: Record<string, string | undefined>,
  startedAt: string
): DeploymentInfo {
  return {
    appName: env.FLY_APP_NAME?.trim() || null,
    imageRef: env.FLY_IMAGE_REF?.trim() || null,
    machineId: env.FLY_MACHINE_ID?.trim() || null,
    startedAt
  };
}
