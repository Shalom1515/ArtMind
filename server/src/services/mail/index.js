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
  try {
    const { data, error } = await resend().emails.send({ from: config.mail.from, to: [to], subject, text });
    if (error) {
      console.error(`[mail] Resend did not accept the email to ${to}: ${error.message || error.name}`);
      return { sent: false };
    }
    return { sent: true, id: data?.id };
  } catch (err) {
    console.error(`[mail] Could not reach Resend: ${err.message}`);
    return { sent: false };
  }
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
