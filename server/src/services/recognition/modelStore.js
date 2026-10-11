import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { config } from '../../config/env.js';

// MobileNet version 2, width 1.0, 224 pixels. tfhub sends a redirect to the real file.
const SOURCE = 'https://tfhub.dev/google/imagenet/mobilenet_v2_100_224/classification/2';
export const modelFolder = path.join(config.paths.models, 'mobilenet');
const modelJson = path.join(modelFolder, 'model.json');

async function fetchFile(url, timeoutMs = 60000) {
  const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) throw new Error(`Download failed with ${response.status} for ${url.split('?')[0]}`);
  return Buffer.from(await response.arrayBuffer());
}

function shardNames(manifest) {
  return manifest.weightsManifest.flatMap((group) => group.paths);
}

export function hasLocalCopy() {
  if (!existsSync(modelJson)) return false;
  return true;
}

export async function downloadModel() {
  const temp = `${modelFolder}_download`;
  await rm(temp, { recursive: true, force: true });
  await mkdir(temp, { recursive: true });
  console.log('[recognition] Downloading the MobileNet model for the first time ...');
  const json = await fetchFile(`${SOURCE}/model.json?tfjs-format=file`);
  const manifest = JSON.parse(json.toString('utf8'));
  for (const name of shardNames(manifest)) {
    await writeFile(path.join(temp, name), await fetchFile(`${SOURCE}/${name}?tfjs-format=file`));
  }
  await writeFile(path.join(temp, 'model.json'), json);
  await rm(modelFolder, { recursive: true, force: true });
  await mkdir(path.dirname(modelFolder), { recursive: true });
  await rename(temp, modelFolder);
  console.log(`[recognition] Saved a copy in ${path.relative(config.paths.root, modelFolder)}`);
}

// A tiny loader that hands the saved files to TensorFlow, so later starts work offline.
export function localLoader() {
  return {
    load: async () => {
      const manifest = JSON.parse(await readFile(modelJson, 'utf8'));
      const buffers = await Promise.all(shardNames(manifest).map((name) => readFile(path.join(modelFolder, name))));
      const all = Buffer.concat(buffers);
      const weightData = all.buffer.slice(all.byteOffset, all.byteOffset + all.byteLength);
      return {
        modelTopology: manifest.modelTopology,
        format: manifest.format,
        generatedBy: manifest.generatedBy,
        convertedBy: manifest.convertedBy,
        signature: manifest.signature,
        userDefinedMetadata: manifest.userDefinedMetadata,
        modelInitializer: manifest.modelInitializer,
        weightSpecs: manifest.weightsManifest.flatMap((group) => group.weights),
        weightData,
      };
    },
  };
}

export async function ensureModelFiles() {
  if (hasLocalCopy()) {
    try {
      const manifest = JSON.parse(await readFile(modelJson, 'utf8'));
      if (shardNames(manifest).every((name) => existsSync(path.join(modelFolder, name)))) return;
    } catch {
    }
  }
  await downloadModel();
}
