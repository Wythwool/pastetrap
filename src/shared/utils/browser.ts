import type {
  RuntimeMessage,
  RuntimeMessageType,
  RuntimeRequestOf,
  RuntimeResponseOf
} from '@/shared/messages';

declare global {
  interface Window {
    chrome?: typeof chrome;
  }
}

export type OptionsSection =
  | 'general'
  | 'categories'
  | 'trusted-domains'
  | 'session-ignores'
  | 'logs'
  | 'privacy'
  | 'about';

const optionsSectionStorageKey = 'pastetrap:options-section';

export function getExtensionApi(): typeof chrome {
  if (typeof chrome !== 'undefined') {
    return chrome;
  }

  if (typeof window !== 'undefined' && window.chrome) {
    return window.chrome;
  }

  throw new Error('Browser extension API is not available in this context.');
}

function isObjectLike(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function ensureResponseShape<TType extends RuntimeMessageType>(
  request: RuntimeRequestOf<TType>,
  response: unknown
): RuntimeResponseOf<TType> {
  if (!isObjectLike(response)) {
    throw new Error(`Empty response for ${request.type}.`);
  }

  if ('ok' in response && response.ok === false) {
    const error = typeof response.error === 'string' ? response.error : `Request failed: ${request.type}`;
    throw new Error(error);
  }

  return response as RuntimeResponseOf<TType>;
}

function rememberOptionsSection(section: OptionsSection): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(optionsSectionStorageKey, section);
  } catch {
    // localStorage can be disabled in some browser profiles. The options page will fall back to hash and defaults.
  }
}

export function consumePendingOptionsSection(): OptionsSection | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const section = window.localStorage.getItem(optionsSectionStorageKey) as OptionsSection | null;
    if (section) {
      window.localStorage.removeItem(optionsSectionStorageKey);
    }
    return section;
  } catch {
    return null;
  }
}

export function runtimeSendMessage<TType extends RuntimeMessageType>(
  message: RuntimeRequestOf<TType>
): Promise<RuntimeResponseOf<TType>> {
  const api = getExtensionApi();

  return new Promise((resolve, reject) => {
    api.runtime.sendMessage(message, (rawResponse: unknown) => {
      const lastError = api.runtime.lastError;
      if (lastError) {
        reject(new Error(lastError.message));
        return;
      }

      try {
        resolve(ensureResponseShape(message, rawResponse));
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  });
}

export function sendMessageToTab<TType extends RuntimeMessageType>(
  tabId: number,
  message: RuntimeRequestOf<TType>
): Promise<RuntimeResponseOf<TType>> {
  const api = getExtensionApi();

  return new Promise((resolve, reject) => {
    api.tabs.sendMessage(tabId, message as RuntimeMessage, (rawResponse: unknown) => {
      const lastError = api.runtime.lastError;
      if (lastError) {
        reject(new Error(lastError.message));
        return;
      }

      try {
        resolve(ensureResponseShape(message, rawResponse));
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  });
}

export function queryActiveTab(): Promise<chrome.tabs.Tab | null> {
  const api = getExtensionApi();

  return new Promise((resolve, reject) => {
    api.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const lastError = api.runtime.lastError;
      if (lastError) {
        reject(new Error(lastError.message));
        return;
      }

      resolve(tabs[0] ?? null);
    });
  });
}

export function openOptionsPage(section?: OptionsSection): Promise<void> {
  const api = getExtensionApi();

  if (section) {
    rememberOptionsSection(section);
  }

  return new Promise((resolve, reject) => {
    api.runtime.openOptionsPage(() => {
      const lastError = api.runtime.lastError;
      if (lastError) {
        reject(new Error(lastError.message));
        return;
      }

      resolve();
    });
  });
}
