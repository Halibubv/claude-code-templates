/**
 * Title, meta description and H1 of the catalog list pages, with the figures
 * read from public/counts.json at build time (so they never go stale).
 * Pure functions so node --test can cover them.
 *
 * Initiative 3 of the traction plan rewrites one list page at a time:
 * /skills/ changed on 2026-11-08.
 */

import { formatNumber, plural } from './ru.ts';

export interface ListPageMeta {
  title: string;
  description: string;
  h1: string;
}

function formatCount(n: number): string {
  return formatNumber(n);
}

export function skillsPageMeta(count: number | undefined): ListPageMeta {
  if (!count || !Number.isFinite(count) || count <= 0) {
    return {
      title: 'Скиллы Claude: открытые скиллы для Claude Code',
      description:
        'Каталог открытых скиллов Claude (папки SKILL.md) для Claude Code: разработка, работа с документами, безопасность, маркетинг и другое. Все файлы скилла на виду, установка одной командой npx.',
      h1: 'Скиллы Claude',
    };
  }
  const n = formatCount(count);
  return {
    title: `Скиллы Claude: ${n} ${plural(count, ['открытый скилл', 'открытых скилла', 'открытых скиллов'])} для Claude Code`,
    description: `${n} ${plural(count, ['открытый скилл', 'открытых скилла', 'открытых скиллов'])} Claude (папки SKILL.md) для Claude Code: разработка, работа с документами, безопасность, маркетинг и другое. Все файлы скилла на виду, установка одной командой npx.`,
    h1: `${n} ${plural(count, ['скилл', 'скилла', 'скиллов'])} Claude`,
  };
}

export interface HomePageMeta {
  title: string;
  description: string;
  /** SoftwareApplication JSON-LD description. */
  schemaDescription: string;
}

/**
 * Home page title/description with the catalog total (sum of the component
 * types in counts.json, see totalComponents). Rounded down to the ten so the
 * title does not change on every added component.
 */
export function homePageMeta(total: number | undefined): HomePageMeta {
  if (!total || !Number.isFinite(total) || total < 10) {
    return {
      title: 'Claude Code Templates: агенты, команды, скиллы и MCP-интеграции',
      description:
        'Каталог готовых компонентов для Claude Code: ИИ-агенты, слэш-команды, скиллы, MCP-интеграции, хуки и настройки. Бесплатный CLI-инструмент с открытым исходным кодом.',
      schemaDescription:
        'CLI-инструмент и каталог компонентов Claude Code: агенты, команды, скиллы, настройки, хуки и MCP-интеграции.',
    };
  }
  // Rounded to the ten, so the number always ends in 0 and takes the genitive plural.
  const n = `${formatCount(Math.floor(total / 10) * 10)}+`;
  return {
    title: `Claude Code Templates: ${n} агентов, команд, скиллов и MCP-интеграций`,
    description: `Каталог из ${n} готовых компонентов для Claude Code: ИИ-агенты, слэш-команды, скиллы, MCP-интеграции, хуки и настройки. Бесплатный CLI-инструмент с открытым исходным кодом.`,
    schemaDescription: `CLI-инструмент и каталог компонентов Claude Code. Более ${n.slice(0, -1)} агентов, команд, скиллов, настроек, хуков и MCP-интеграций.`,
  };
}
