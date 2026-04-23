import type { RuntimeMessage } from '@/shared/messages';
import { getSettings } from '@/shared/storage/settingsStore';
import { getExtensionApi } from '@/shared/utils/browser';
import { formatRuntimeError, handleRuntimeMessage } from '@/background/runtimeRouter';

getExtensionApi().runtime.onInstalled.addListener(() => {
  void getSettings();
});

getExtensionApi().runtime.onMessage.addListener((message: RuntimeMessage, sender, sendResponse) => {
  void handleRuntimeMessage(message, sender)
    .then((response) => sendResponse(response))
    .catch((error: unknown) => {
      sendResponse(formatRuntimeError(error));
    });

  return true;
});
