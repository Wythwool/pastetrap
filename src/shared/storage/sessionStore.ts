import type { LatestTabState } from '@/shared/types';
import { storageGet, storageSet } from '@/shared/storage/browserStorage';

const ignoresKey = 'session-ignores';
const latestStatesKey = 'latest-tab-states';

export async function getSessionIgnores(): Promise<string[]> {
  return storageGet<string[]>('session', ignoresKey, []);
}

export async function addSessionIgnore(pageKey: string): Promise<string[]> {
  const current = await getSessionIgnores();
  const next = [...new Set([...current, pageKey])];
  await storageSet('session', ignoresKey, next);
  return next;
}

export async function clearSessionIgnores(): Promise<void> {
  await storageSet('session', ignoresKey, []);
}

export async function getLatestStates(): Promise<Record<string, LatestTabState>> {
  return storageGet<Record<string, LatestTabState>>('session', latestStatesKey, {});
}

export async function getLatestState(tabId: number): Promise<LatestTabState | null> {
  const states = await getLatestStates();
  return states[String(tabId)] ?? null;
}

export async function saveLatestState(state: LatestTabState): Promise<void> {
  const states = await getLatestStates();
  const next: Record<string, LatestTabState> = {
    ...states,
    [String(state.tabId)]: state
  };

  const entries = Object.entries(next)
    .sort((left, right) => right[1].updatedAt.localeCompare(left[1].updatedAt))
    .slice(0, 40);

  await storageSet('session', latestStatesKey, Object.fromEntries(entries));
}
