import { existsSync, readFileSync, statSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { config } from '../../config/env.js';

// Remembers embeddings of image files on disk, so the seed and the tests do not repeat slow work.
const cacheFile = path.join(config.paths.models, 'embeddings.json');
let cache = null;

function load() {
  if (cache) return cache;
  try {
    cache = existsSync(cacheFile) ? JSON.parse(readFileSync(cacheFile, 'utf8')) : {};
  } catch {
    cache = {};
  }
  return cache;
}

function keyFor(filePath) {
  const info = statSync(filePath);
  return `${path.basename(filePath)}:${info.size}:${Math.round(info.mtimeMs)}`;
}

export function cachedEmbedding(filePath) {
  try {
    return load()[keyFor(filePath)] || null;
  } catch {
    return null;
  }
}

export async function rememberEmbedding(filePath, embedding) {
  try {
    load()[keyFor(filePath)] = embedding;
    await mkdir(path.dirname(cacheFile), { recursive: true });
    await writeFile(cacheFile, JSON.stringify(cache));
  } catch (err) {
    console.warn(`[recognition] Could not save the embedding cache: ${err.message}`);
  }
}
