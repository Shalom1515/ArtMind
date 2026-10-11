import { config, modelIsSet } from '../../config/env.js';

// The only place in the server that talks to the language model. Any failure returns null,
// and the caller falls back to our own rules.
export const TIMEOUTS = { search: 6000, assistant: 20000, writing: 20000 };

let sendReasoning = true;

async function post(body, timeoutMs) {
  return fetch(`${config.assistant.url}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.assistant.key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
}

export function isAvailable() {
  return modelIsSet();
}

export async function chat(messages, { timeoutMs = TIMEOUTS.assistant } = {}) {
  if (!modelIsSet()) return null;
  const body = { model: config.assistant.model, messages, temperature: 0.3, max_completion_tokens: 1024 };
  if (sendReasoning) body.reasoning_effort = 'low';
  try {
    let response = await post(body, timeoutMs);
    if (response.status === 400 && body.reasoning_effort) {
      const detail = await response.text().catch(() => '');
      if (!/reasoning/i.test(detail)) {
        console.warn('[model] The request was refused (400).');
        return null;
      }
      sendReasoning = false;
      delete body.reasoning_effort;
      response = await post(body, timeoutMs);
    }
    if (!response.ok) {
      console.warn(`[model] The service answered ${response.status}. Using our own rules instead.`);
      return null;
    }
    const data = await response.json().catch(() => null);
    const content = String(data?.choices?.[0]?.message?.content || '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    return content || null;
  } catch (err) {
    console.warn(`[model] ${err.name === 'TimeoutError' ? 'The request took too long' : `The request failed (${err.message})`}. Using our own rules instead.`);
    return null;
  }
}

export function parseJson(text) {
  if (!text) return null;
  const clean = String(text).replace(/```(?:json)?/gi, '').trim();
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const value = JSON.parse(clean.slice(start, end + 1));
    return value && typeof value === 'object' ? value : null;
  } catch {
    return null;
  }
}

export async function chatJson(messages, options) {
  return parseJson(await chat(messages, options));
}

export function resetForTests() {
  sendReasoning = true;
}
