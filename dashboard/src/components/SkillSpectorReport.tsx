import type { SkillSpectorResult } from '../lib/types';
import { ShieldCheckIcon } from './SkillSpectorBadge';
import { plural } from '../lib/ru';

const OBSERVATION_FORMS: [string, string, string] = ['замечание', 'замечания', 'замечаний'];

// SkillSpector report on the component page. Informative, not alarming:
// neutral colors, no severity labels or install verdicts. Rendered on the
// server only (no client directive), so it ships no JavaScript.

interface Props {
  result: SkillSpectorResult;
}

export default function SkillSpectorReport({ result }: Props) {
  // Findings are grouped by (id, title, file); `count` is how many observations each row stands for.
  const shown = result.findings.reduce((total, f) => total + f.count, 0);
  return (
    <section
      id="security-scan"
      className="mb-10 scroll-mt-24 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/25 text-[var(--color-accent)]">
            <ShieldCheckIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-[var(--color-text-primary)]">Проверено NVIDIA SkillSpector</h3>
            <p className="mt-1 text-[12px] text-[var(--color-text-tertiary)]">
              Автоматический статический анализ (без LLM)
              {result.version ? ` · v${result.version}` : ''}
              {result.scannedAt ? ` · ${result.scannedAt.slice(0, 10)}` : ''}
            </p>
            {result.analysis === 'partial' && (
              <p className="mt-1 text-[12px] text-[var(--color-text-tertiary)]">
                Частичный анализ: часть проверок не удалось запустить для этого компонента.
              </p>
            )}
          </div>
        </div>
        <div className="sm:text-right">
          <div className="font-mono text-[13px] text-[var(--color-text-secondary)]">
            <span className="text-[var(--color-text-primary)] font-semibold">{result.issueCount}</span>{' '}
            {plural(result.issueCount, OBSERVATION_FORMS)}
          </div>
          <div className="mt-0.5 font-mono text-[11px] text-[var(--color-text-tertiary)]">оценка сканера {result.score}/100</div>
        </div>
      </div>

      <p className="mt-4 text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
        SkillSpector ищет характерные шаблоны: команды оболочки, доступ к учётным данным, сетевые запросы,
        незакреплённые версии зависимостей. Замечание — это место в файлах, которое стоит прочитать перед
        установкой, а не подтверждённая уязвимость. У компонентов, которые запускают код локально (хуки,
        MCP-серверы, инструменты безопасности), замечаний естественно больше.
      </p>

      {result.findings.length > 0 ? (
        <ul className="mt-5 divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
          {result.findings.map((f, i) => (
            <li key={i} className="flex gap-3 py-3">
              <span className="mt-[7px] w-1.5 h-1.5 rounded-full shrink-0 bg-[var(--color-text-tertiary)]" aria-hidden="true" />
              <div className="min-w-0">
                <div className="text-[13px] text-[var(--color-text-primary)]">
                  {f.title}
                  {f.count > 1 && <span className="font-mono text-[11px] text-[var(--color-text-tertiary)]"> ×{f.count}</span>}
                </div>
                <div className="mt-0.5 font-mono text-[11px] text-[var(--color-text-tertiary)] break-all">
                  {f.category} · {f.file}{f.line ? `:${f.line}` : ''}
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-5 text-[13px] text-[var(--color-text-secondary)]">Замечаний нет.</p>
      )}

      <p className="mt-4 text-[11px] text-[var(--color-text-tertiary)]">
        {result.issueCount > shown ? `Показано ${shown} из ${result.issueCount} ${plural(result.issueCount, ['замечания', 'замечаний', 'замечаний'])}. ` : ''}
        Подробнее о{' '}
        <a
          href="https://github.com/NVIDIA/skillspector"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-[var(--color-text-primary)]"
        >
          NVIDIA SkillSpector
        </a>
        {' '}и о том,{' '}
        <a href="/security" className="underline hover:text-[var(--color-text-primary)]">
          как проверяются компоненты
        </a>
        .
      </p>
    </section>
  );
}
