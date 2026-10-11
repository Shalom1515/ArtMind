import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';
import sharp from 'sharp';
import { cachedEmbedding, rememberEmbedding } from './embeddingCache.js';
import { ensureModelFiles, localLoader } from './modelStore.js';

const SIZE = 224;
let model = null;
let status = 'idle';
let loading = null;

export const modelStatus = () => status;
export const isModelReady = () => status === 'ready';

export function loadModel() {
  if (loading) return loading;
  status = 'loading';
  loading = (async () => {
    await tf.setBackend('cpu');
    await tf.ready();
    await ensureModelFiles();
    model = await mobilenet.load({ version: 2, alpha: 1.0, modelUrl: localLoader(), inputRange: [0, 1] });
    status = 'ready';
    console.log('[recognition] MobileNet is ready');
    return model;
  })().catch((err) => {
    status = 'failed';
    loading = null;
    throw new Error(`MobileNet could not load, so style recognition will use simple rules for now (${err.message})`);
  });
  return loading;
}

async function pixels(input) {
  return sharp(input).rotate().removeAlpha().resize(SIZE, SIZE, { fit: 'fill' }).raw().toBuffer();
}

function toTensor(data) {
  return tf.tensor3d(new Int32Array(data), [SIZE, SIZE, 3], 'int32');
}

// Returns the 1280 number MobileNet embedding, scaled to length 1 so cosine similarity is a dot product.
export async function embed(input) {
  if (!isModelReady()) return null;
  const data = await pixels(input);
  const out = tf.tidy(() => {
    const features = model.infer(toTensor(data), true).flatten();
    return tf.div(features, tf.add(tf.norm(features), 1e-8));
  });
  const values = await out.data();
  out.dispose();
  return Array.from(values, (v) => Math.round(v * 1e5) / 1e5);
}

export async function embedFile(filePath) {
  const cached = cachedEmbedding(filePath);
  if (cached) return cached;
  const embedding = await embed(filePath);
  if (embedding) await rememberEmbedding(filePath, embedding);
  return embedding;
}

export async function classify(input, top = 5) {
  if (!isModelReady()) return [];
  const data = await pixels(input);
  const tensor = toTensor(data);
  try {
    return await model.classify(tensor, top);
  } finally {
    tensor.dispose();
  }
}

export function cosine(a, b) {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i += 1) dot += a[i] * b[i];
  return dot;
}
