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
  '[class*="security"]',
  '[id*="captcha"]',
  '[id*="verify"]',
  '[id*="copy"]',
  '[id*="terminal"]'
].join(',');

const codeSelector = 'pre, code, textarea, kbd, tt, samp, [class*="code"], [data-command], [data-copy]';
const controlSelector = 'button, [role="button"], a, input[type="button"], input[type="submit"], [onclick], [data-copy], [data-command]';
const copyControlPattern = /(copy|verify|continue|run|fix|open|human|captcha|скопир|копію|встав|провер|перевір|продолж|продовж|abrir|copiar|pegar|verificar|continuar)/i;
const interestingAttributePattern = /(command|copy|verify|captcha|bot|run|payload|clipboard|terminal|powershell|update|script|cmd)/i;
const commandishValuePattern = /(powershell|pwsh|cmd(?:\.exe)?|curl|wget|bash|zsh|osascript|mshta|rundll32|regsvr32|certutil|bitsadmin|https?:\/\/)/i;

interface CollectionRoot {
  querySelectorAll: Document['querySelectorAll'];
}

function rootQuery(root: CollectionRoot, selector: string): Element[] {
  try {
    return Array.from(root.querySelectorAll(selector));
  } catch {
    return [];
  }
}

function collectText(nodes: Iterable<Element>, maxItems: number, maxLength: number): string[] {
  const values: string[] = [];

  for (const node of nodes) {
    const text = normalizeWhitespace(node.textContent ?? node.getAttribute('value') ?? node.getAttribute('aria-label') ?? '');
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

function getOpenShadowRoots(maxRoots = 20): ShadowRoot[] {
  const roots: ShadowRoot[] = [];
  const queue: Element[] = Array.from(document.querySelectorAll('*')).slice(0, 3000);

  while (queue.length > 0 && roots.length < maxRoots) {
    const element = queue.shift();
    const shadowRoot = element?.shadowRoot;
    if (!shadowRoot) {
      continue;
    }

    roots.push(shadowRoot);
    queue.push(...Array.from(shadowRoot.querySelectorAll('*')).slice(0, 300));
  }

  return roots;
}

function collectDataAttributes(nodes: Iterable<Element>): string[] {
  const values: string[] = [];

  for (const node of nodes) {
    for (const attributeName of node.getAttributeNames()) {
      if (!interestingAttributePattern.test(attributeName)) {
        continue;
      }

      const attributeValue = node.getAttribute(attributeName);
      if (!attributeValue) {
        continue;
      }

      values.push(`${attributeName}=${truncate(attributeValue, 320)}`);
    }
  }

  return uniqueStrings(values).slice(0, 60);
}

function collectClipboardAttributes(nodes: Iterable<Element>): string[] {
  const values: string[] = [];

  for (const node of nodes) {
    for (const attributeName of node.getAttributeNames()) {
      if (!/(data-copy|data-command|data-payload|data-clipboard|onclick|value|aria-label)/i.test(attributeName)) {
        continue;
      }

      const attributeValue = node.getAttribute(attributeName) ?? '';
      if (!commandishValuePattern.test(attributeValue)) {
        continue;
      }

      values.push(attributeValue);
    }
  }

  return uniqueStrings(values).slice(0, 30);
}

function copyLikeControls(roots: CollectionRoot[]): Element[] {
  return roots
    .flatMap((root) => rootQuery(root, controlSelector))
    .filter((element) =>
      copyControlPattern.test(
        normalizeWhitespace(
          element.textContent ?? element.getAttribute('value') ?? element.getAttribute('aria-label') ?? element.getAttribute('title') ?? ''
        )
      ) || Array.from(element.getAttributeNames()).some((name) => /(copy|command|payload|clipboard)/i.test(name))
    );
}

function collectCopyCommandPairs(controls: Element[]): string[] {
  const values: string[] = [];

  for (const control of controls) {
    const directAttributes = ['data-command', 'data-copy', 'data-payload', 'data-clipboard-text', 'value', 'onclick']
      .map((name) => control.getAttribute(name) ?? '')
      .filter((value) => commandishValuePattern.test(value));
    values.push(...directAttributes);

    const container = control.closest('section, article, main, form, dialog, div') ?? control.parentElement;
    if (!container) {
      continue;
    }

    const nearbyCandidates = Array.from(container.querySelectorAll(codeSelector)).slice(0, 4);
    for (const nearbyCandidate of nearbyCandidates) {
      if (nearbyCandidate.textContent) {
        values.push(nearbyCandidate.textContent);
      }
    }

    const fallbackText = normalizeWhitespace(container.textContent ?? '');
    if (fallbackText.length > 24 && commandishValuePattern.test(fallbackText)) {
      values.push(fallbackText);
    }
  }

  return uniqueStrings(values).slice(0, 30);
}

function collectIframeDescriptors(): string[] {
  return Array.from(document.querySelectorAll('iframe')).map((iframe, index) => {
    const title = iframe.getAttribute('title') ?? '';
    const name = iframe.getAttribute('name') ?? '';
    const src = iframe.getAttribute('src') ?? iframe.getAttribute('data-src') ?? '';
    const aria = iframe.getAttribute('aria-label') ?? '';
    return truncate(normalizeWhitespace(`iframe#${index + 1} ${title} ${name} ${src} ${aria}`), 260);
  }).filter(Boolean).slice(0, 20);
}

function collectMediaDescriptors(): string[] {
  const values: string[] = [];

  for (const element of document.querySelectorAll('canvas, video, audio, img, svg')) {
    const descriptor = normalizeWhitespace([
      element.tagName.toLowerCase(),
      element.getAttribute('alt') ?? '',
      element.getAttribute('title') ?? '',
      element.getAttribute('aria-label') ?? '',
      element.getAttribute('src') ?? '',
      element.getAttribute('data-src') ?? '',
      element.getAttribute('class') ?? '',
      element.getAttribute('id') ?? ''
    ].join(' '));

    if (descriptor && /(captcha|verify|human|bot|update|security|провер|перевір|робот|verific|seguridad)/i.test(descriptor)) {
      values.push(truncate(descriptor, 260));
    }
  }

  return uniqueStrings(values).slice(0, 30);
}

function bodyTextFallback(): string {
  const visibleText = document.body?.innerText ?? '';
  const fallbackText = document.body?.textContent ?? '';
  return truncate(normalizeWhitespace(visibleText.length >= fallbackText.length * 0.25 ? visibleText : fallbackText), 16000);
}

export function collectPageSnapshot(extras: { clipboardPayloads?: string[] } = {}): PageSnapshot {
  const url = window.location.href;
  const title = document.title || 'Untitled page';
  const domain = getDomainFromUrl(url);
  const metaDescription = normalizeWhitespace(
    document.querySelector('meta[name="description"]')?.getAttribute('content') ?? ''
  );
  const shadowRoots = getOpenShadowRoots();
  const roots: CollectionRoot[] = [document, ...shadowRoots];
  const controls = copyLikeControls(roots);
  const suspiciousContainers = roots.flatMap((root) => rootQuery(root, suspiciousSelector));
  const codeBlocks = roots.flatMap((root) => rootQuery(root, codeSelector));
  const dialogNodes = roots.flatMap((root) => rootQuery(root, 'dialog, [role="dialog"], [aria-modal="true"]'));
  const ariaNodes = roots.flatMap((root) => rootQuery(root, '[aria-label]'));
  const allInterestingNodes = uniqueElementList([
    ...controls,
    ...suspiciousContainers,
    ...codeBlocks,
    ...ariaNodes,
    ...roots.flatMap((root) => rootQuery(root, '[data-command], [data-copy], [data-payload], [data-clipboard], [onclick]'))
  ]);
  const clipboardAttributes = collectClipboardAttributes(allInterestingNodes);
  const shadowText = shadowRoots.map((root) => truncate(normalizeWhitespace(root.textContent ?? ''), 1400)).filter(Boolean);
  const iframeDescriptors = collectIframeDescriptors();
  const mediaDescriptors = collectMediaDescriptors();
  const clipboardPayloads = uniqueStrings([...(extras.clipboardPayloads ?? []), ...clipboardAttributes]).slice(0, 40);

  return {
    url,
    domain,
    title,
    metaDescription,
    bodyText: bodyTextFallback(),
    buttons: collectText(roots.flatMap((root) => rootQuery(root, 'button, [role="button"], input[type="button"], input[type="submit"]')), 60, 140),
    links: collectText(roots.flatMap((root) => rootQuery(root, 'a')), 50, 140),
    codeBlocks: collectText(codeBlocks, 50, 420),
    dialogs: collectText(dialogNodes, 30, 260),
    ariaLabels: uniqueStrings(ariaNodes.map((element) => element.getAttribute('aria-label') ?? '').filter(Boolean)).slice(0, 50),
    dataAttributes: collectDataAttributes(allInterestingNodes),
    suspiciousContainers: collectText(suspiciousContainers, 50, 300),
    copyCommandPairs: collectCopyCommandPairs(controls),
    shadowText,
    iframeDescriptors,
    mediaDescriptors,
    clipboardPayloads,
    metrics: {
      copyLikeControls: controls.length,
      suspiciousContainers: suspiciousContainers.length,
      codeBlocks: codeBlocks.length,
      dialogs: dialogNodes.length,
      iframes: document.querySelectorAll('iframe').length,
      shadowRoots: shadowRoots.length,
      mediaElements: document.querySelectorAll('canvas, video, audio, img, svg').length,
      clipboardAttributes: clipboardAttributes.length,
      textLength: document.body?.textContent?.length ?? 0
    }
  };
}

function uniqueElementList(values: Element[]): Element[] {
  return [...new Set(values)];
}
