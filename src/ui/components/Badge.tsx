import type { RiskLevel } from '@/shared/types';
import { t } from '@/shared/i18n/messages';
import type { Language } from '@/shared/types';

interface BadgeProps {
  language: Language;
  level: RiskLevel;
}

export function Badge({ language, level }: BadgeProps): JSX.Element {
  return (
    <span className="badge" data-level={level}>
      {t(language, `common.risk.${level}`)}
    </span>
  );
}
