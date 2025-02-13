import type { Platform } from 'hel-types';
import { getGlobalThis, getAppPlatform } from 'hel-micro-core';

function getBodyContainer(idOrTriggerNode: any) {
  if (typeof idOrTriggerNode === 'string') {
    return getGlobalThis()?.document.getElementById(idOrTriggerNode);
  }
  return idOrTriggerNode;
}

export default function (name: string, options?: { platform?: Platform, versionId?: string }) {
  return {
    name,
    platform: options?.platform || getAppPlatform(name),
    versionId: options?.versionId || '',
    getShadowAppRoot: getBodyContainer,
    getShadowBodyRoot: getBodyContainer,
  };
}
