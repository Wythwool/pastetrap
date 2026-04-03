import type { CommandCandidate, DetectionRuleMatch } from '@/shared/types';
import { createRuleMatch } from '@/shared/detection/rules';

function evidenceFromCommand(command: CommandCandidate): string[] {
  return [command.preview, ...command.indicators.map((indicator) => indicator.evidence)].slice(0, 4);
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

    const hasRemoteUrl = indicatorIds.has('remote-url');
    const hasExecution =
      indicatorIds.has('iex') ||
      indicatorIds.has('start-process') ||
      indicatorIds.has('bash-c') ||
      indicatorIds.has('cmd-c') ||
      indicatorIds.has('curl-pipe-bash') ||
      indicatorIds.has('wget-pipe-shell');

    if (hasRemoteUrl && hasExecution) {
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
      indicatorIds.has('schtasks')
    ) {
      addRule('windows-lolbin-abuse');
    }

    if (indicatorIds.has('curl-pipe-bash') || indicatorIds.has('wget-pipe-shell')) {
      addRule('unix-pipe-shell');
    }

    if (indicatorIds.has('osascript')) {
      addRule('macos-osascript');
    }

    if (indicatorIds.has('temp-path') && (indicatorIds.has('chmod-execute') || hasExecution)) {
      addRule('temp-execute-chain');
    }

    if (
      indicatorIds.has('from-base64') ||
      indicatorIds.has('backtick-obfuscation') ||
      indicatorIds.has('char-join')
    ) {
      addRule('obfuscation-signals');
    }

    const stageCount = Number(hasRemoteUrl) + Number(hasExecution) + Number(indicatorIds.has('temp-path')) + Number(indicatorIds.has('chmod-execute'));
    if (stageCount >= 3) {
      addRule('multi-stage-chain');
    }
  }

  return [...matches.values()];
}
