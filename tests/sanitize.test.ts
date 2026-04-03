import { describe, expect, it } from 'vitest';
import { sanitizePreview } from '@/shared/detection/sanitize';

describe('sanitizePreview', () => {
  it('redacts long blobs and preserves host context', () => {
    const preview = sanitizePreview(
      'powershell -enc AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA https://bad.test/payload.exe?token=abc123'
    );

    expect(preview).toContain('[blob:');
    expect(preview).toContain('https://bad.test/payload.exe');
    expect(preview).not.toContain('token=abc123');
  });
});
