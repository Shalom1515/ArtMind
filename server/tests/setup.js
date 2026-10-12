import { vi } from 'vitest';

// Tests never call the real language model or send real email.
vi.mock('../src/services/assistant/modelClient.js', async (importOriginal) => {
  const real = await importOriginal();
  return {
    TIMEOUTS: real.TIMEOUTS,
    parseJson: real.parseJson,
    isAvailable: vi.fn(() => false),
    chat: vi.fn(async () => null),
    chatJson: vi.fn(async () => null),
    resetForTests: vi.fn(),
  };
});

vi.mock('../src/services/mail/index.js', () => {
  const sent = [];
  return {
    sent,
    sendMail: vi.fn(async (mail) => {
      sent.push(mail);
      return { sent: true };
    }),
    sendVerificationCode: vi.fn(async (to, name, code) => {
      sent.push({ to, code });
      return { sent: true };
    }),
    sendResetLink: vi.fn(async (to, name, link) => {
      sent.push({ to, link });
      return { sent: true };
    }),
  };
});
