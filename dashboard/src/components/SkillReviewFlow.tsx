import { useEffect, useMemo, useRef, useState } from 'react';

// Animated node graph of how a skill reaches the catalog (/security).
// Every node and caption describes a real workflow or script in this repo;
// keep them in sync when the pipeline changes.

type NodeId =
  | 'author' | 'pr' | 'validate' | 'manifest' | 'skillspector' | 'audit' | 'bots'
  | 'gate' | 'catalog' | 'site' | 'install' | 'weekly';

interface FlowNode { x: number; y: number; w: number; h: number; title: string; sub: string }

const W = 1230;
const H = 490;

const NODES: Record<NodeId, FlowNode> = {
  author:       { x: 10,   y: 206, w: 150, h: 58, title: 'Участник', sub: 'открывает PR' },
  pr:           { x: 200,  y: 206, w: 155, h: 58, title: 'Pull request', sub: 'cli-tool/components/…' },
  validate:     { x: 400,  y: 26,  w: 200, h: 56, title: 'claude plugin validate', sub: 'официальный валидатор · блок' },
  manifest:     { x: 400,  y: 112, w: 200, h: 56, title: 'Проверка source.json', sub: 'лицензия + коммит' },
  skillspector: { x: 400,  y: 198, w: 200, h: 56, title: 'SkillSpector', sub: '64 шаблона · блок > 50' },
  audit:        { x: 400,  y: 284, w: 200, h: 56, title: 'Аудит безопасности', sub: '5 валидаторов · комментарии' },
  bots:         { x: 400,  y: 370, w: 200, h: 56, title: 'Боты-ревьюеры', sub: 'cubic + greptile' },
  gate:         { x: 650,  y: 206, w: 160, h: 58, title: 'Шлюз PR', sub: 'проверки + треды' },
  catalog:      { x: 855,  y: 206, w: 170, h: 58, title: 'Сборка каталога', sub: 'пересканирует всё' },
  site:         { x: 1065, y: 112, w: 155, h: 58, title: 'aitmpl.com', sub: 'знак + отчёт проверки' },
  install:      { x: 1065, y: 300, w: 155, h: 58, title: 'Установка', sub: 'CLI или Claude Code' },
  weekly:       { x: 855,  y: 380, w: 170, h: 58, title: 'Еженедельные задачи', sub: 'рескан · валидация' },
};

type EdgeKey = `${NodeId}>${NodeId}`;

function edgePath(from: NodeId, to: NodeId): string {
  const a = NODES[from];
  const b = NODES[to];
  if (from === 'weekly' && to === 'catalog') {
    const x = a.x + a.w / 2;
    return `M ${x} ${a.y} L ${x} ${b.y + b.h}`;
  }
  if (from === 'weekly' && to === 'author') {
    const sy = a.y + a.h / 2;
    const ex = b.x + b.w / 2;
    return `M ${a.x} ${sy} C ${a.x - 160} ${H - 4}, ${ex + 60} ${H - 4}, ${ex} ${b.y + b.h}`;
  }
  const sx = a.x + a.w;
  const sy = a.y + a.h / 2;
  const ex = b.x;
  const ey = b.y + b.h / 2;
  const dx = (ex - sx) * 0.5;
  return `M ${sx} ${sy} C ${sx + dx} ${sy}, ${ex - dx} ${ey}, ${ex} ${ey}`;
}

const EDGES: EdgeKey[] = [
  'author>pr',
  'pr>validate', 'pr>manifest', 'pr>skillspector', 'pr>audit', 'pr>bots',
  'validate>gate', 'manifest>gate', 'skillspector>gate', 'audit>gate', 'bots>gate',
  'gate>catalog', 'catalog>site', 'catalog>install',
  'weekly>catalog', 'weekly>author',
];

interface Move { edge: EdgeKey; label: string; fail?: boolean }
interface Step { moves: Move[]; title: string; body: string; source: string }
interface Scenario { id: string; label: string; author?: { title: string; sub: string }; steps: Step[] }

const SCENARIOS: Scenario[] = [
  {
    id: 'skill',
    label: 'Скилл в этом репозитории',
    steps: [
      {
        moves: [{ edge: 'author>pr', label: 'SKILL.md + файлы' }],
        title: 'Pull request добавляет скилл',
        body: 'Скилл лежит в cli-tool/components/skills/{category}/{name}/. PR участника содержит только эти файлы: защитная проверка валит любой PR из форка, который заодно правит сгенерированный JSON каталога.',
        source: '.github/workflows/generated-files-guard.yml',
      },
      {
        moves: [
          { edge: 'pr>validate', label: 'изменённый скилл' },
          { edge: 'pr>skillspector', label: 'изменённый скилл' },
          { edge: 'pr>audit', label: 'SKILL.md' },
          { edge: 'pr>bots', label: 'diff' },
        ],
        title: 'Проверки идут только по изменённому скиллу',
        body: 'Собственный валидатор Claude Code проверяет формат. NVIDIA SkillSpector выполняет статический анализ без LLM: prompt injection, утечка данных, цепочка поставок, опасный код, сигнатуры YARA. Аудит безопасности запускает пять валидаторов (структура, целостность, семантика, ссылки, происхождение). cubic и greptile проверяют diff.',
        source: 'component-validate.yml · skill-security-scan.yml · component-security-validation.yml',
      },
      {
        moves: [
          { edge: 'validate>gate', label: '0 ошибок' },
          { edge: 'skillspector>gate', label: 'оценка ≤ 50' },
          { edge: 'audit>gate', label: 'комментарий с отчётом' },
          { edge: 'bots>gate', label: 'треды закрыты' },
        ],
        title: 'Шлюз PR ждёт их всех',
        body: 'Шлюз не пропускает PR, если хоть одна проверка красная или остался нерешённый тред ревью. PR из форка никогда не сливается сам: мейнтейнер читает его и сливает вручную.',
        source: '.github/workflows/pr-gate.yml · pr-automerge.yml',
      },
      {
        moves: [{ edge: 'gate>catalog', label: 'слияние в main' }],
        title: 'Каталог пересобирается и пересканируется',
        body: 'В main генератор пересобирает каталог, а SkillSpector заново сканирует каждый компонент (с кешем по хешу файла и версии сканера). Оценка и главные находки сохраняются в записи каталога.',
        source: 'update-component-content.yml · scripts/skillspector_catalog.py',
      },
      {
        moves: [
          { edge: 'catalog>site', label: 'результат проверки' },
          { edge: 'catalog>install', label: 'npx … --skill' },
        ],
        title: 'Публикуется вместе с отчётом проверки',
        body: 'На странице компонента видны знак «Проверено NVIDIA SkillSpector» и все замечания, их можно прочитать до установки. Проверка только информирует: она никогда не влияет на ранжирование и поиск.',
        source: 'SkillSpectorReport.tsx',
      },
    ],
  },
  {
    id: 'external',
    label: 'Внешний скилл',
    author: { title: 'Репозиторий автора', sub: 'GitHub автора' },
    steps: [
      {
        moves: [{ edge: 'author>pr', label: 'source.json @ коммит' }],
        title: 'Код остаётся в репозитории автора',
        body: 'В папке каталога лежит только source.json: репозиторий, путь, лицензия и полный 40-символьный коммит. Ветки и теги не принимаются, поэтому изменения у автора не меняют то, что устанавливается.',
        source: 'cli-tool/src/external-skill.js',
      },
      {
        moves: [
          { edge: 'pr>validate', label: 'файлы @ коммит' },
          { edge: 'pr>manifest', label: 'source.json' },
          { edge: 'pr>skillspector', label: 'файлы @ коммит' },
          { edge: 'pr>bots', label: 'diff' },
        ],
        title: 'Проверяются именно закреплённые файлы',
        body: 'Проверка манифеста требует лицензию из разрешённого списка, совпадающую с LICENSE репозитория на этом коммите. Валидатор и SkillSpector скачивают скилл ровно на этом коммите и сканируют именно эти байты.',
        source: 'scripts/external_skills.py check · skill-security-scan.yml',
      },
      {
        moves: [
          { edge: 'validate>gate', label: '0 ошибок' },
          { edge: 'manifest>gate', label: 'лицензия ок' },
          { edge: 'skillspector>gate', label: 'оценка ≤ 50' },
          { edge: 'bots>gate', label: 'треды закрыты' },
        ],
        title: 'Тот же шлюз, что и для любого скилла',
        body: 'Прежде чем PR сольют, должны пройти все проверки и закрыться все треды ревью.',
        source: '.github/workflows/pr-gate.yml',
      },
      {
        moves: [{ edge: 'gate>catalog', label: 'слияние в main' }],
        title: 'Сайт показывает закреплённые файлы',
        body: 'Генератор скачивает закреплённый коммит и кладёт его файлы на страницу компонента, так что на aitmpl.com вы читаете ровно то, что установит CLI.',
        source: 'scripts/generate_components_json.py',
      },
      {
        moves: [
          { edge: 'catalog>site', label: 'файлы + проверка' },
          { edge: 'catalog>install', label: 'blob sha проверен' },
        ],
        title: 'Каждый файл сверяется при установке',
        body: 'CLI скачивает каждый файл из этого коммита и сверяет его с git blob sha, прежде чем записать в .claude/skills/.',
        source: 'cli-tool/src/external-skill.js',
      },
    ],
  },
  {
    id: 'plugin',
    label: 'Плагин',
    author: { title: 'Репозиторий автора', sub: 'GitHub плагина' },
    steps: [
      {
        moves: [{ edge: 'author>pr', label: 'plugins/…/source.json' }],
        title: 'Плагины целиком закрепляются так же',
        body: 'Плагин Claude Code попадает в каталог через source.json, закреплённый на коммите. Символические ссылки и подмодули не принимаются, имя плагина должно совпадать с его папкой.',
        source: 'scripts/external_skills.py',
      },
      {
        moves: [
          { edge: 'pr>validate', label: 'корень плагина' },
          { edge: 'pr>manifest', label: 'source.json' },
          { edge: 'pr>skillspector', label: 'корень плагина' },
          { edge: 'pr>bots', label: 'diff' },
        ],
        title: 'Сканируется корень плагина',
        body: 'claude plugin validate проверяет плагин и сгенерированный маркетплейс. SkillSpector сканирует весь корень плагина, как скилл.',
        source: 'validate_components.py · skillspector_scan.py',
      },
      {
        moves: [
          { edge: 'validate>gate', label: '0 ошибок' },
          { edge: 'manifest>gate', label: 'лицензия ок' },
          { edge: 'skillspector>gate', label: 'оценка ≤ 50' },
          { edge: 'bots>gate', label: 'треды закрыты' },
        ],
        title: 'Тот же шлюз',
        body: 'Прежде чем PR сольют, должны пройти все проверки и закрыться все треды ревью.',
        source: '.github/workflows/pr-gate.yml',
      },
      {
        moves: [{ edge: 'gate>catalog', label: 'слияние в main' }],
        title: 'Записывается marketplace.json',
        body: 'Генератор записывает маркетплейс aitmpl: по одной записи на плагин, с git-источником и закреплённым sha.',
        source: 'dashboard/public/marketplace.json',
      },
      {
        moves: [
          { edge: 'catalog>site', label: 'marketplace.json' },
          { edge: 'catalog>install', label: 'name@aitmpl @ sha' },
        ],
        title: 'Claude Code ставит ровно этот коммит',
        body: 'claude plugin install name@aitmpl клонирует плагин на закреплённом sha. CLI отказывается работать с Claude Code старше 2.1.288: в этой версии исправили неполную установку.',
        source: 'cli-tool/src/plugin-install.js',
      },
    ],
  },
  {
    id: 'blocked',
    label: 'Заблокирован',
    steps: [
      {
        moves: [{ edge: 'author>pr', label: 'SKILL.md + файлы' }],
        title: 'Присылают рискованный скилл',
        body: 'Вход тот же, что у любого другого скилла.',
        source: '',
      },
      {
        moves: [
          { edge: 'pr>validate', label: 'изменённый скилл' },
          { edge: 'pr>skillspector', label: 'изменённый скилл' },
        ],
        title: 'SkillSpector выставляет оценку',
        body: 'Оценка от 0 до 100: 0–20 низкая, 21–50 средняя, 51–80 высокая, 81–100 критическая. Изменённый скилл для сравнения сканируется ещё и в версии из main.',
        source: 'scripts/skillspector_scan.py --compare-base',
      },
      {
        moves: [{ edge: 'skillspector>gate', label: 'оценка > 50', fail: true }],
        title: 'Проверка падает, PR останавливается',
        body: 'Новый скилл с оценкой выше 50 или правка, которая поднимает оценку выше 50, валит проверку. Шлюз PR остаётся красным, и ничего не попадает в каталог, пока находки не исправят.',
        source: '.github/workflows/skill-security-scan.yml',
      },
    ],
  },
  {
    id: 'weekly',
    label: 'Еженедельная перепроверка',
    author: { title: 'Репозиторий автора', sub: 'новые коммиты' },
    steps: [
      {
        moves: [{ edge: 'weekly>catalog', label: 'полный рескан' }],
        title: 'Весь каталог проверяется каждую неделю',
        body: 'Каждый понедельник SkillSpector сканирует все скиллы (это отчёт, а не блокировка), а claude plugin validate проходит по всему каталогу и падает на любой ошибке.',
        source: 'skill-security-scan-all.yml · component-validate.yml',
      },
      {
        moves: [{ edge: 'weekly>author', label: 'есть новый коммит' }],
        title: 'Изменения у автора отмечаются, но не подтягиваются',
        body: 'Один issue перечисляет закреплённые скиллы и плагины, в чьих репозиториях есть новые коммиты. Само по себе ничего не обновляется.',
        source: '.github/workflows/external-skills-outdated.yml',
      },
      {
        moves: [{ edge: 'author>pr', label: 'PR меняет коммит' }],
        title: 'Обновление — это новый pull request',
        body: 'Пользователи получают новый код только после того, как PR передвинет коммит и снова пройдёт все проверки.',
        source: 'scripts/external_skills.py',
      },
    ],
  },
];

const TRAVEL_MS = 1500;
const HOLD_MS = 1700;

function labelWidth(text: string) {
  return Math.round(text.length * 6.1 + 14);
}

export default function SkillReviewFlow() {
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);
  const [progress, setProgress] = useState(0); // 0..1 travel of the current step
  const [playing, setPlaying] = useState(true);
  const [done, setDone] = useState(false);
  const pathRefs = useRef<Partial<Record<EdgeKey, SVGPathElement | null>>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const elapsedRef = useRef(0);

  const scenario = SCENARIOS[scenarioIdx];
  const step = scenario.steps[stepIdx];

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setPlaying(false);
      setProgress(1);
    }
  }, []);

  // Drive the animation: travel, hold, next step.
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      elapsedRef.current += now - last;
      last = now;
      const e = elapsedRef.current;
      setProgress(Math.min(1, e / TRAVEL_MS));
      if (e >= TRAVEL_MS + HOLD_MS) {
        elapsedRef.current = 0;
        if (stepIdx < scenario.steps.length - 1) {
          setStepIdx((s) => s + 1);
          setProgress(0);
        } else {
          setPlaying(false);
          setDone(true);
        }
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, stepIdx, scenarioIdx]);

  // On narrow screens keep the moving packets in view.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    const xs = step.moves.flatMap((m) => {
      const [f, t] = m.edge.split('>') as [NodeId, NodeId];
      return [NODES[f].x, NODES[t].x + NODES[t].w];
    });
    const mid = (Math.min(...xs) + Math.max(...xs)) / 2;
    const scale = el.scrollWidth / W;
    el.scrollTo({ left: mid * scale - el.clientWidth / 2, behavior: 'smooth' });
  }, [scenarioIdx, stepIdx]);

  const inScenario = useMemo(() => {
    const nodes = new Set<NodeId>();
    const edges = new Set<EdgeKey>();
    for (const s of scenario.steps) for (const m of s.moves) {
      edges.add(m.edge);
      const [f, t] = m.edge.split('>') as [NodeId, NodeId];
      nodes.add(f); nodes.add(t);
    }
    return { nodes, edges };
  }, [scenarioIdx]);

  const reached = useMemo(() => {
    const nodes = new Set<NodeId>();
    const edges = new Set<EdgeKey>();
    const failed = new Set<NodeId>();
    scenario.steps.forEach((s, i) => {
      if (i > stepIdx) return;
      for (const m of s.moves) {
        const [f, t] = m.edge.split('>') as [NodeId, NodeId];
        nodes.add(f);
        if (i < stepIdx || progress >= 1) {
          nodes.add(t);
          edges.add(m.edge);
          if (m.fail) failed.add(t);
        }
      }
    });
    return { nodes, edges, failed };
  }, [scenarioIdx, stepIdx, progress]);

  const restart = (idx = scenarioIdx) => {
    setScenarioIdx(idx);
    setStepIdx(0);
    setProgress(0);
    elapsedRef.current = 0;
    setDone(false);
    setPlaying(true);
  };

  const jumpTo = (i: number) => {
    setStepIdx(i);
    elapsedRef.current = 0;
    setProgress(playing ? 0 : 1);
    setDone(false);
  };

  const togglePlay = () => {
    if (done) return restart();
    setPlaying((p) => !p);
  };

  const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

  return (
    <div className="srf rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-1)]">
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--color-border)] px-4 py-3">
        <div role="tablist" aria-label="Сценарий" className="flex flex-wrap gap-1.5">
          {SCENARIOS.map((s, i) => (
            <button
              key={s.id}
              role="tab"
              aria-selected={i === scenarioIdx}
              onClick={() => restart(i)}
              className={`rounded-md border px-2.5 py-1 text-[12px] transition-colors ${
                i === scenarioIdx
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-text-primary)]'
                  : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={togglePlay}
            className="rounded-md border border-[var(--color-border)] px-2.5 py-1 text-[12px] text-[var(--color-text-primary)] hover:border-[var(--color-accent)]"
            aria-label={playing ? 'Пауза' : 'Воспроизвести'}
          >
            {playing ? '❚❚ Пауза' : '▶ Пуск'}
          </button>
          <button
            onClick={() => restart()}
            className="rounded-md border border-[var(--color-border)] px-2.5 py-1 text-[12px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          >
            ↺ Повторить
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="overflow-x-auto overscroll-x-contain">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block w-full min-w-[860px]"
          role="img"
          aria-label={`Схема проверки, сценарий: ${scenario.label}. Шаг ${stepIdx + 1}: ${step.title}`}
        >
          <defs>
            <marker id="srf-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="9" markerHeight="9" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-border-strong)" />
            </marker>
            <marker id="srf-arrow-on" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="9" markerHeight="9" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-accent)" />
            </marker>
          </defs>

          {EDGES.map((key) => {
            const [f, t] = key.split('>') as [NodeId, NodeId];
            const active = inScenario.edges.has(key);
            const lit = reached.edges.has(key);
            const fail = lit && reached.failed.has(t) && step.moves.some((m) => m.edge === key && m.fail);
            return (
              <path
                key={key}
                ref={(el) => { pathRefs.current[key] = el; }}
                d={edgePath(f, t)}
                fill="none"
                stroke={fail ? 'var(--srf-fail)' : lit ? 'var(--color-accent)' : 'var(--color-border-strong)'}
                strokeWidth={lit ? 2 : 1.25}
                strokeDasharray={key.startsWith('weekly') ? '5 5' : undefined}
                opacity={active ? 1 : 0.25}
                markerEnd={lit && !fail ? 'url(#srf-arrow-on)' : 'url(#srf-arrow)'}
              />
            );
          })}

          {(Object.keys(NODES) as NodeId[]).map((id) => {
            const n = NODES[id];
            const text = id === 'author' && scenario.author ? scenario.author : n;
            const active = inScenario.nodes.has(id);
            const lit = reached.nodes.has(id);
            const failed = reached.failed.has(id);
            return (
              <g key={id} opacity={active ? 1 : 0.28} className="srf-node">
                <rect
                  x={n.x} y={n.y} width={n.w} height={n.h} rx={10}
                  fill={failed ? 'var(--srf-fail-bg)' : lit ? 'var(--srf-lit-bg)' : 'var(--color-surface-2)'}
                  stroke={failed ? 'var(--srf-fail)' : lit ? 'var(--color-accent)' : 'var(--color-border-strong)'}
                  strokeWidth={lit ? 1.5 : 1}
                />
                <text x={n.x + 12} y={n.y + n.h / 2 - 4} fontSize="13" fontWeight="600" fill="var(--color-text-primary)">
                  {failed ? '✕ ' : ''}{text.title}
                </text>
                <text x={n.x + 12} y={n.y + n.h / 2 + 14} fontSize="10.5" fill="var(--color-text-tertiary)" className="srf-mono">
                  {text.sub}
                </text>
              </g>
            );
          })}

          {step.moves.map((m) => {
            const path = pathRefs.current[m.edge];
            if (!path) return null;
            const len = path.getTotalLength();
            const p = path.getPointAtLength(len * ease(progress));
            const lw = labelWidth(m.label);
            const color = m.fail && progress >= 1 ? 'var(--srf-fail)' : 'var(--color-accent)';
            const lx = Math.max(4, Math.min(W - lw - 4, p.x - lw / 2));
            // Fade out on arrival so the packet never covers the node it lit.
            const fade = m.fail ? 1 : progress < 0.85 ? 1 : Math.max(0, (1 - progress) / 0.15);
            return (
              <g key={`${scenario.id}-${stepIdx}-${m.edge}`} pointerEvents="none" opacity={fade}>
                <circle cx={p.x} cy={p.y} r={9} fill={color} opacity={0.18} />
                <circle cx={p.x} cy={p.y} r={5} fill={color} />
                <rect x={lx} y={p.y - 30} width={lw} height={18} rx={9} fill="var(--color-surface-0)" stroke={color} strokeWidth={1} />
                <text x={lx + lw / 2} y={p.y - 17.5} fontSize="10.5" textAnchor="middle" fill="var(--color-text-primary)" className="srf-mono">
                  {m.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="border-t border-[var(--color-border)] px-4 py-4 sm:px-5">
        <div className="mb-3 flex items-center gap-1.5" aria-label="Шаги">
          {scenario.steps.map((s, i) => (
            <button
              key={i}
              onClick={() => jumpTo(i)}
              aria-label={`Шаг ${i + 1}: ${s.title}`}
              aria-current={i === stepIdx ? 'step' : undefined}
              className={`h-1.5 rounded-full transition-all ${
                i === stepIdx ? 'w-6 bg-[var(--color-accent)]' : i < stepIdx ? 'w-3 bg-[var(--color-accent)]/50' : 'w-3 bg-[var(--color-surface-4)]'
              }`}
            />
          ))}
          <span className="ml-2 font-mono text-[11px] text-[var(--color-text-tertiary)]">
            {stepIdx + 1}/{scenario.steps.length}
          </span>
        </div>
        <p className="text-[14px] font-semibold text-[var(--color-text-primary)]" aria-live="polite">{step.title}</p>
        <p className="mt-1 text-[13px] leading-relaxed text-[var(--color-text-secondary)]">{step.body}</p>
        {step.source && (
          <p className="mt-2 font-mono text-[11px] text-[var(--color-text-tertiary)] break-words">{step.source}</p>
        )}
      </div>

      <style>{`
        .srf { --srf-fail: #e5534b; --srf-fail-bg: rgba(229, 83, 75, 0.1); --srf-lit-bg: rgba(213, 116, 85, 0.08); }
        .srf text { font-family: var(--font-sans, ui-sans-serif, system-ui, sans-serif); }
        .srf text.srf-mono { font-family: var(--font-mono, ui-monospace, monospace); }
        .srf-node rect { transition: fill 300ms, stroke 300ms; }
      `}</style>
    </div>
  );
}
