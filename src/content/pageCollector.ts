import type { PageSnapshot } from '@/shared/types';
import { getDomainFromUrl } from '@/shared/utils/domain';
import { normalizeWhitespace, truncate, uniqueStrings } from '@/shared/utils/text';

const suspiciousSelector = [
  'dialog',
  '[role="dialog"]',
  '[aria-modal="true"]',
  '[class*="captcha"]',
  '[class*="verify"]',
  '[class*="copy"]',
  '[class*="terminal"]',
  '[class*="powershell"]',
  '[class*="update"]',
  '[id*="captcha"]',
  '[id*="verify"]',
  '[id*="copy"]'
].join(',');

function collectText(nodes: Iterable<Element>, maxItems: number, maxLength: number): string[] {
  const values: string[] = [];

  for (const node of nodes) {
    const text = normalizeWhitespace(node.textContent ?? '');
    if (!text) {
      continue;
    }

    values.push(truncate(text, maxLength));
    if (values.length >= maxItems) {
      break;
    }
  }

  return uniqueStrings(values);
}

function collectDataAttributes(nodes: Iterable<Element>): string[] {
  const values: string[] = [];

  for (const node of nodes) {
    for (const attributeName of node.getAttributeNames()) {
      if (!attributeName.startsWith('data-')) {
        continue;
      }

      if (!/(command|copy|verify|captcha|bot|run)/i.test(attributeName)) {
        continue;
      }

      const attributeValue = node.getAttribute(attributeName);
      if (!attributeValue) {
        continue;
      }

      values.push(`${attributeName}=${attributeValue}`);
    }
  }

  return uniqueStrings(values).slice(0, 30);
}

function copyLikeControls(): Element[] {
  return Array.from(document.querySelectorAll('button, [role="button"], a, input[type="button"], input[type="submit"]')).filter((element) =>
    /(copy|verify|continue|run|fix|open)/i.test(normalizeWhitespace(element.textContent ?? element.getAttribute('value') ?? ''))
  );
}

function collectCopyCommandPairs(controls: Element[]): string[] {
  const values: string[] = [];

  for (const control of controls) {
    const container = control.closest('section, article, main, form, div') ?? control.parentElement;
    if (!container) {
      continue;
    }

    const nearbyCandidate = container.querySelector('pre, code, textarea, tt, kbd');
    if (nearbyCandidate?.textContent) {
      values.push(nearbyCandidate.textContent);
      continue;
    }

    const fallbackText = normalizeWhitespace(container.textContent ?? '');
    if (fallbackText.length > 24) {
      values.push(fallbackText);
    }
  }

  return uniqueStrings(values).slice(0, 20);
}

export function collectPageSnapshot(): PageSnapshot {
  const url = window.location.href;
  const title = document.title || 'Untitled page';
  const domain = getDomainFromUrl(url);
  const metaDescription = normalizeWhitespace(
    document.querySelector('meta[name="description"]')?.getAttribute('content') ?? ''
  );
  const bodyText = truncate(normalizeWhitespace(document.body?.innerText ?? ''), 12000);
  const controls = copyLikeControls();
  const suspiciousContainers = Array.from(document.querySelectorAll(suspiciousSelector));

  return {
    url,
    domain,
    title,
    metaDescription,
    bodyText,
    buttons: collectText(document.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"]'), 40, 120),
    links: collectText(document.querySelectorAll('a'), 40, 120),
    codeBlocks: collectText(document.querySelectorAll('pre, code, textarea, kbd, tt'), 30, 320),
    dialogs: collectText(document.querySelectorAll('dialog, [role="dialog"], [aria-modal="true"]'), 20, 220),
    ariaLabels: uniqueStrings(
      Array.from(document.querySelectorAll('[aria-label]'), (element) => element.getAttribute('aria-label') ?? '').filter(Boolean)
    ).slice(0, 30),
    dataAttributes: collectDataAttributes(suspiciousContainers),
    suspiciousContainers: collectText(suspiciousContainers, 30, 220),
    copyCommandPairs: collectCopyCommandPairs(controls),
    metrics: {
      copyLikeControls: controls.length,
      suspiciousContainers: suspiciousContainers.length,
      codeBlocks: document.querySelectorAll('pre, code, textarea, kbd, tt').length,
      dialogs: document.querySelectorAll('dialog, [role="dialog"], [aria-modal="true"]').length
    }
  };
}
