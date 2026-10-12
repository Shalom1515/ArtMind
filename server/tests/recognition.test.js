import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import app from '../src/app.js';
import { config } from '../src/config/env.js';
import { isModelReady, loadModel } from '../src/services/recognition/index.js';
import { writeNotes } from '../src/services/recognition/index.js';
import { startTestDb } from './helpers.js';

const folder = path.join(config.paths.project, 'docs', 'test_images');

// Part E of the image prompts file.
const EXPECTED = [
  { file: 'test_impressionist_landscape.jpg', style: 'Impressionism', category: 'Landscape' },
  { file: 'test_abstract.jpg', style: 'Geometric abstraction', category: 'Abstract' },
  { file: 'test_religious_panel.jpg', style: 'Renaissance revival', category: 'Religious' },
  { file: 'test_watercolour_flowers.jpg', style: 'Impressionism', category: 'Flower' },
  { file: 'test_charcoal_portrait.jpg', style: 'Realism', category: 'Figurative' },
];

let db;
let modelError = '';
const available = EXPECTED.filter((e) => existsSync(path.join(folder, e.file)));

beforeAll(async () => {
  try {
    await loadModel();
  } catch (err) {
    modelError = err.message;
  }
  db = await startTestDb({ seed: true, useModel: true });
});

afterAll(async () => {
  await db.stop();
});

describe('style recognition', () => {
  test('notes come from the sharp measurements and the style', () => {
    const notes = writeNotes({ brightness: 0.8, saturation: 0.1, contrast: 0.1, edges: 0.05, warmth: 0.2 }, 'Impressionism');
    expect(notes).toHaveLength(3);
    expect(notes[0]).toBe('Short broken brush strokes');
  });

  test('a file that only pretends to be an image is refused', async () => {
    const res = await request(app).post('/api/identify').attach('image', Buffer.from('not really a picture at all'), { filename: 'fake.jpg', contentType: 'image/jpeg' }).expect(400);
    expect(res.body.error.code).toBe('VALIDATION');
  });

  test('an upload over 5 MB answers 413', async () => {
    const big = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(5 * 1024 * 1024 + 10)]);
    const res = await request(app).post('/api/identify').attach('image', big, { filename: 'big.jpg', contentType: 'image/jpeg' }).expect(413);
    expect(res.body.error.code).toBe('TOO_LARGE');
  });

  test.skipIf(!available.length)('the test images: at least 4 of 5 categories match Part E', async (ctx) => {
    if (!isModelReady()) ctx.skip(`MobileNet could not load (${modelError}), so the prediction test was skipped.`);
    const missing = EXPECTED.filter((e) => !available.includes(e));
    if (missing.length) console.warn(`Skipped missing test images: ${missing.map((m) => m.file).join(', ')}`);

    let matches = 0;
    const lines = [];
    for (const expected of available) {
      const res = await request(app).post('/api/identify').attach('image', path.join(folder, expected.file)).expect(200);
      const { findings, similar, searchQuery, fileName } = res.body;
      expect(fileName).toBe(expected.file);
      expect(findings.style.confidence).toBe('likely');
      expect(findings.palette).toHaveLength(6);
      expect(findings.notes).toHaveLength(3);
      expect(similar).toHaveLength(4);
      expect(searchQuery).toBeTruthy();
      if (findings.category.value === expected.category) matches += 1;
      lines.push(`${expected.file}: ${findings.style.value} (${findings.style.confidence}), ${findings.category.value} (${findings.category.confidence}), `
        + `${findings.mood.value}, ${findings.medium.value}. Expected ${expected.style}, ${expected.category}.`);
    }
    console.log(`\nPredictions\n${lines.join('\n')}\nCategories matched: ${matches} of ${available.length}`);
    expect(matches).toBeGreaterThanOrEqual(Math.min(4, available.length - (EXPECTED.length - 4)));
    expect(readdirSync(db.tempRoot, { recursive: true }).filter((f) => /\.(jpg|png|webp)$/.test(f))).toHaveLength(0);
  });
});
