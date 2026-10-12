import { Resend } from 'resend';
import { config } from '../../config/env.js';

let client = null;
let clientKey = '';

function resend() {
  if (!client || clientKey !== config.mail.resendKey) {
    client = new Resend(config.mail.resendKey);
    clientKey = config.mail.resendKey;
  }
  return client;
}

const RETRY_DELAY = 1500;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isTemporary = (error) => !error.statusCode || error.statusCode === 429 || error.statusCode >= 500;

async function attempt(mail) {
  try {
    const { data, error } = await resend().emails.send(mail);
    return error ? { error } : { id: data?.id };
  } catch (err) {
    return { error: { message: err.message } };
  }
}

export function logMailStatus() {
  if (!config.mail.resendKey) console.warn('[mail] RESEND_API_KEY is empty in server/.env. Emails will be printed here instead of sent.');
  else if (!config.mail.from) console.warn('[mail] MAIL_FROM is empty in server/.env. Emails cannot be sent.');
  else console.log(`[mail] Sending email as ${config.mail.from} through Resend`);
}

// Never throws. A failed send is logged and the request carries on.
export async function sendMail({ to, subject, text }) {
  if (!config.mail.resendKey) {
    console.log(`\n[mail] RESEND_API_KEY is empty, so here is the email instead.\nTo: ${to}\nSubject: ${subject}\n\n${text}\n`);
    return { sent: false, printed: true };
  }
  if (!config.mail.from) {
    console.error('[mail] MAIL_FROM is empty in server/.env, so the email was not sent.');
    return { sent: false };
  }
  const mail = { from: config.mail.from, to: [to], subject, text };
  let result = await attempt(mail);
  if (result.error && isTemporary(result.error)) {
    await wait(RETRY_DELAY);
    result = await attempt(mail);
  }
  if (result.error) {
    console.error(`[mail] Could not send "${subject}" to ${to}: ${result.error.message || result.error.name}`);
    return { sent: false };
  }
  console.log(`[mail] Sent "${subject}" to ${to} (id ${result.id})`);
  return { sent: true, id: result.id };
}

export function sendVerificationCode(to, name, code) {
  return sendMail({
    to,
    subject: `Your ArtMind code is ${code}`,
    text: `ArtMind\n\nHello ${name}, here is your code. It expires in 10 minutes.\n\n${code}`,
  });
}

export function sendResetLink(to, name, link) {
  return sendMail({
    to,
    subject: 'Reset your ArtMind password',
    text: `ArtMind\n\nHello ${name}, use this link within one hour to choose a new password.\n\n${link}`,
  });
}
