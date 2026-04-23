import type { CommandCandidate, DetectionRuleMatch } from '@/shared/types';
import { createRuleMatch } from '@/shared/detection/rules';

function evidenceFromCommand(command: CommandCandidate): string[] {
  return [command.preview, ...command.indicators.map((indicator) => indicator.evidence)].slice(0, 5);
}

export function matchCommandSignals(commands: CommandCandidate[]): DetectionRuleMatch[] {
  const matches = new Map<string, DetectionRuleMatch>();

  for (const command of commands) {
    const indicatorIds = new Set(command.indicators.map((indicator) => indicator.id));

    const addRule = (ruleId: Parameters<typeof createRuleMatch>[0]): void => {
      if (!matches.has(ruleId)) {
        matches.set(ruleId, createRuleMatch(ruleId, evidenceFromCommand(command), 'command'));
      }
    };

    const hasRemoteUrl = indicatorIds.has('remote-url') || indicatorIds.has('short-url');
    const hasDownloader =
      indicatorIds.has('iwr-irm') ||
      indicatorIds.has('download-string') ||
      indicatorIds.has('download-to-file') ||
      /\b(?:curl|wget)\b/i.test(command.normalized);
    const hasExecution =
      indicatorIds.has('iex') ||
      indicatorIds.has('start-process') ||
      indicatorIds.has('bash-c') ||
      indicatorIds.has('cmd-c') ||
      indicatorIds.has('curl-pipe-bash') ||
      indicatorIds.has('wget-pipe-shell') ||
      indicatorIds.has('remote-shell-wrapper') ||
      indicatorIds.has('python-remote-exec') ||
      indicatorIds.has('perl-remote-exec') ||
      indicatorIds.has('shell-chain');

    if (hasRemoteUrl && (hasExecution || hasDownloader)) {
      addRule('remote-download-execute');
    }

    if (indicatorIds.has('powershell-encoded') || indicatorIds.has('long-base64')) {
      addRule('encoded-payload');
    }

    if (
      indicatorIds.has('mshta') ||
      indicatorIds.has('rundll32') ||
      indicatorIds.has('regsvr32') ||
      indicatorIds.has('certutil') ||
      indicatorIds.has('bitsadmin') ||
      indicatorIds.has('schtasks') ||
      indicatorIds.has('wmic')
    ) {
      addRule('windows-lolbin-abuse');
    }

    if (indicatorIds.has('curl-pipe-bash') || indicatorIds.has('wget-pipe-shell') || indicatorIds.has('remote-shell-wrapper')) {
      addRule('unix-pipe-shell');
    }

    if (indicatorIds.has('osascript') || indicatorIds.has('launchctl')) {
      addRule('macos-osascript');
    }

    if (indicatorIds.has('temp-path') && (indicatorIds.has('chmod-execute') || hasExecution || hasDownloader)) {
      addRule('temp-execute-chain');
    }

    if (
      indicatorIds.has('from-base64') ||
      indicatorIds.has('backtick-obfuscation') ||
      indicatorIds.has('char-join') ||
      indicatorIds.has('env-var-expansion') ||
      indicatorIds.has('powershell-hidden')
    ) {
      addRule('obfuscation-signals');
    }

    if (command.source === 'clipboard-payload') {
      addRule('clipboard-payload-command');
    }

    const stageCount =
      Number(hasRemoteUrl) +
      Number(hasDownloader) +
      Number(hasExecution) +
      Number(indicatorIds.has('temp-path')) +
      Number(indicatorIds.has('chmod-execute')) +
      Number(indicatorIds.has('download-to-file'));

    if (stageCount >= 3) {
      addRule('multi-stage-chain');
    }
  }

  return [...matches.values()];
}
