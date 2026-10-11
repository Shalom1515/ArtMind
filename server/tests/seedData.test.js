import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CATEGORIES, COLOUR_GROUPS, MEDIUMS, MOODS, STYLES, SURFACES } from '../src/config/constants.js';

const read = (name) => JSON.parse(readFileSync(new URL(`../data/seed/${name}`, import.meta.url), 'utf8'));

const paintings = read('paintings.json');
const artists = read('artists.json');
const collections = read('collections.json');
const users = read('users.json');
const faq = read('faq.json');

describe('seed data', () => {
  test('there are 60 paintings with unique slugs, ten per category', () => {
    assert.equal(paintings.length, 60);
    assert.equal(new Set(paintings.map((p) => p.slug)).size, 60);
    for (const category of CATEGORIES) {
      assert.equal(paintings.filter((p) => p.category === category).length, 10, category);
    }
  });

  test('every painting uses known values', () => {
    const colourKeys = COLOUR_GROUPS.map((c) => c.key);
    const artistSlugs = new Set(artists.map((a) => a.slug));
    for (const p of paintings) {
      assert.ok(artistSlugs.has(p.artistSlug), p.slug);
      assert.ok(STYLES.includes(p.style), `${p.slug} style`);
      assert.ok(MEDIUMS.includes(p.medium), `${p.slug} medium`);
      assert.ok(SURFACES.includes(p.surface), `${p.slug} surface`);
      assert.ok(MOODS.includes(p.mood), `${p.slug} mood`);
      assert.ok(p.tags.length >= 5 && p.tags.length <= 7, `${p.slug} tags`);
      assert.ok(p.colourGroups.every((c) => colourKeys.includes(c)), `${p.slug} colours`);
      assert.equal(p.image, `/images/paintings/${p.slug}.jpg`);
    }
  });

  test('eight paintings are featured and one is the painting of the day', () => {
    assert.equal(paintings.filter((p) => p.featured).length, 8);
    assert.deepEqual(paintings.filter((p) => p.heroOfDay).map((p) => p.slug), ['morning-on-the-river']);
  });

  test('there are 12 artists and every one has paintings', () => {
    assert.equal(artists.length, 12);
    for (const a of artists) assert.ok(paintings.some((p) => p.artistSlug === a.slug), a.slug);
  });

  test('six collections of eight known paintings', () => {
    const slugs = new Set(paintings.map((p) => p.slug));
    assert.equal(collections.length, 6);
    for (const c of collections) {
      assert.equal(c.paintings.length, 8, c.slug);
      assert.ok(c.paintings.every((s) => slugs.has(s)), c.slug);
      assert.ok(!c.slug.includes('-'), c.slug);
    }
  });

  test('users never hold passwords', () => {
    for (const u of users) {
      assert.equal(u.password, undefined);
      assert.match(u.passwordEnv, /^SEED_(ADMIN|USER)_PASSWORD$/);
    }
  });

  test('faq has eight answers', () => {
    assert.equal(faq.length, 8);
  });
});
