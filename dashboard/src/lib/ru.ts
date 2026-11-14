/**
 * Помощники для русской версии интерфейса.
 *
 * В русском у существительного после числа три формы:
 * 1 компонент, 2 компонента, 5 компонентов (а 11–14 всегда «компонентов»).
 */

/** Выбирает нужную форму слова для числа n: forms = ['компонент', 'компонента', 'компонентов']. */
export function plural(n: number, forms: [string, string, string]): string {
  const abs = Math.abs(Math.trunc(n));
  const mod100 = abs % 100;
  const mod10 = abs % 10;
  if (mod100 >= 11 && mod100 <= 14) return forms[2];
  if (mod10 === 1) return forms[0];
  if (mod10 >= 2 && mod10 <= 4) return forms[1];
  return forms[2];
}

/** Число и слово в нужной форме: pluralize(5, [...]) → «5 компонентов». */
export function pluralize(n: number, forms: [string, string, string], formatted?: string): string {
  return `${formatted ?? formatNumber(n)} ${plural(n, forms)}`;
}

/** Число с пробелами между тысячами: 1778348 → «1 778 348». */
export function formatNumber(n: number): string {
  return n.toLocaleString('ru-RU');
}

/** Русские названия типов компонентов (ключи совпадают с типами в данных). */
export const TYPE_LABELS_RU: Record<string, string> = {
  skills: 'Скиллы',
  agents: 'Агенты',
  commands: 'Команды',
  settings: 'Настройки',
  hooks: 'Хуки',
  mcps: 'MCP',
  mods: 'Моды',
  plugins: 'Плагины',
  templates: 'Шаблоны',
  sandbox: 'Песочницы',
  loops: 'Циклы',
};
