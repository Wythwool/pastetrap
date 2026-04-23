import { getExtensionApi } from '@/shared/utils/browser';

const sessionFallbackPrefix = 'session:';

type StorageValue = unknown;

type StorageAreaName = 'local' | 'session';

function resolveArea(areaName: StorageAreaName): chrome.storage.StorageArea {
  const api = getExtensionApi();

  if (areaName === 'session' && api.storage.session) {
    return api.storage.session;
  }

  return api.storage.local;
}

function withSessionFallbackKey(areaName: StorageAreaName, key: string): string {
  if (areaName === 'session' && !getExtensionApi().storage.session) {
    return `${sessionFallbackPrefix}${key}`;
  }

  return key;
}

export function storageGet<T>(areaName: StorageAreaName, key: string, fallback: T): Promise<T> {
  const area = resolveArea(areaName);
  const storageKey = withSessionFallbackKey(areaName, key);

  return new Promise((resolve, reject) => {
    area.get(storageKey, (payload) => {
      const lastError = getExtensionApi().runtime.lastError;
      if (lastError) {
        reject(new Error(lastError.message));
        return;
      }

      resolve((payload[storageKey] as T | undefined) ?? fallback);
    });
  });
}

export function storageSet(areaName: StorageAreaName, key: string, value: StorageValue): Promise<void> {
  const area = resolveArea(areaName);
  const storageKey = withSessionFallbackKey(areaName, key);

  return new Promise((resolve, reject) => {
    area.set({ [storageKey]: value }, () => {
      const lastError = getExtensionApi().runtime.lastError;
      if (lastError) {
        reject(new Error(lastError.message));
        return;
      }

      resolve();
    });
  });
}

export function storageRemove(areaName: StorageAreaName, key: string): Promise<void> {
  const area = resolveArea(areaName);
  const storageKey = withSessionFallbackKey(areaName, key);

  return new Promise((resolve, reject) => {
    area.remove(storageKey, () => {
      const lastError = getExtensionApi().runtime.lastError;
      if (lastError) {
        reject(new Error(lastError.message));
        return;
      }

      resolve();
    });
  });
}
