import { hashText } from './hash';

export function createId(prefix: string, seed: string): string {
  return `${prefix}_${hashText(seed)}`;
}
