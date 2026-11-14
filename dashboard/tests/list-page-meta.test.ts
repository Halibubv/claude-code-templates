import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { skillsPageMeta } from '../src/lib/list-page-meta.ts';
import { formatNumber } from '../src/lib/ru.ts';

test('skills meta uses the count in title, description and H1', () => {
  const meta = skillsPageMeta(918);
  assert.equal(meta.title, 'Скиллы Claude: 918 открытых скиллов для Claude Code');
  assert.match(meta.description, /^918 открытых скиллов Claude/);
  assert.equal(meta.h1, '918 скиллов Claude');
});

test('skills meta formats thousands', () => {
  assert.equal(skillsPageMeta(1204).h1, `${formatNumber(1204)} скилла Claude`);
});

test('skills meta picks the Russian plural form', () => {
  assert.equal(skillsPageMeta(1).h1, '1 скилл Claude');
  assert.equal(skillsPageMeta(921).title, `Скиллы Claude: ${formatNumber(921)} открытый скилл для Claude Code`);
  assert.equal(skillsPageMeta(912).h1, '912 скиллов Claude');
});

test('skills meta drops the figure when the count is missing', () => {
  for (const c of [undefined, 0, Number.NaN]) {
    const meta = skillsPageMeta(c);
    assert.doesNotMatch(meta.title, /\d/);
    assert.equal(meta.h1, 'Скиллы Claude');
  }
});

test('skills title stays within what Google shows, with the current count', () => {
  const counts = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, '..', 'public', 'counts.json'), 'utf-8'));
  const meta = skillsPageMeta(counts.skills);
  assert.ok(meta.title.length <= 60, meta.title);
  assert.ok(meta.description.length <= 220, String(meta.description.length));
});

import { homePageMeta } from '../src/lib/list-page-meta.ts';
import { totalComponents } from '../src/lib/agent-readiness.ts';

test('home meta rounds the total down to the ten', () => {
  const meta = homePageMeta(1987);
  assert.equal(meta.title, `Claude Code Templates: ${formatNumber(1980)}+ агентов, команд, скиллов и MCP-интеграций`);
  assert.ok(meta.description.startsWith(`Каталог из ${formatNumber(1980)}+ готовых компонентов`), meta.description);
  assert.ok(meta.schemaDescription.includes(`Более ${formatNumber(1980)} агентов`), meta.schemaDescription);
});

test('home meta drops the figure when the total is missing', () => {
  for (const c of [undefined, 0, Number.NaN]) {
    const meta = homePageMeta(c);
    assert.doesNotMatch(meta.title, /\d/);
    assert.doesNotMatch(meta.description, /\d/);
    assert.doesNotMatch(meta.schemaDescription, /\d/);
  }
});

test('home meta with the current counts', () => {
  const counts = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, '..', 'public', 'counts.json'), 'utf-8'));
  const meta = homePageMeta(totalComponents(counts));
  assert.match(meta.title, /\d\s\d{3}\+/);
  assert.ok(meta.description.length <= 220, String(meta.description.length));
});
