import type { Platform } from 'hel-types';
import * as core from 'hel-micro-core';


export function getPlatform(platform?: Platform): Platform {
  return platform || core.getPlatform();
}


export function getPlatformConfig(platform?: Platform) {
  return core.getPlatformConfig(platform);
}


export function getPlatformHost(platform?: Platform) {
  return core.getPlatformHost(platform);
}
