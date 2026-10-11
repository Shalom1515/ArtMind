import { config } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

const RESEND_URL = 'https://api.resend.com/emails';

export async function sendMail({ to, subject, text, html }) {
  if (!config.mail.resendKey || !config.mail.from) {
    throw new ApiError(503, 'Email is not set up yet. Add RESEND_API_KEY and MAIL_FROM to server/.env.', 'MAIL_NOT_SET_UP');
  }

  let response;
  try {
    response = await fetch(RESEND_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.mail.resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: config.mail.from, to: [to], subject, text, html }),
    });
  } catch (err) {
    console.error('[mail] Could not reach Resend:', err.message);
    throw new ApiError(502, 'We could not send the email just now. Please try again.', 'MAIL_FAILED');
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error(`[mail] Resend answered ${response.status}: ${data.message || data.name || 'unknown error'}`);
    throw new ApiError(502, 'We could not send the email just now. Please try again.', 'MAIL_FAILED');
  }
  return { id: data.id };
}

const wrap = (body) => `<div style="font-family:Georgia,serif;color:#1B1917;background:#F4EFE6;padding:32px">
<div style="max-width:480px;margin:0 auto;background:#F8F5EF;border:1px solid #D9D0C1;padding:32px">
<p style="font-size:24px;margin:0 0 24px">ArtMind</p>${body}
<p style="font-family:Arial,sans-serif;font-size:12px;color:#77706A;margin-top:32px">An online painting gallery for everyone who loves art.</p>
</div></div>`;

export function sendVerificationCode(to, name, code) {
  return sendMail({
    to,
    subject: `Your ArtMind code is ${code}`,
    text: `Hello ${name},\n\nYour ArtMind code is ${code}. It expires in 15 minutes.\n\nIf you did not create an account, you can ignore this email.`,
    html: wrap(`<p style="font-family:Arial,sans-serif;font-size:15px">Hello ${escapeHtml(name)},</p>
<p style="font-family:Arial,sans-serif;font-size:15px">Your ArtMind code is:</p>
<p style="font-size:36px;letter-spacing:8px;margin:16px 0">${code}</p>
<p style="font-family:Arial,sans-serif;font-size:13px;color:#77706A">It expires in 15 minutes. If you did not create an account, you can ignore this email.</p>`),
  });
}

export function sendResetLink(to, name, link) {
  return sendMail({
    to,
    subject: 'Reset your ArtMind password',
    text: `Hello ${name},\n\nUse this link to choose a new password: ${link}\n\nThe link expires one hour after it was sent. If you did not ask for it, you can ignore this email.`,
    html: wrap(`<p style="font-family:Arial,sans-serif;font-size:15px">Hello ${escapeHtml(name)},</p>
<p style="font-family:Arial,sans-serif;font-size:15px">Use the button below to choose a new password.</p>
<p style="margin:24px 0"><a href="${link}" style="background:#1B1917;color:#F4EFE6;padding:12px 24px;text-decoration:none;font-family:Arial,sans-serif;font-size:12px;letter-spacing:2px">RESET PASSWORD</a></p>
<p style="font-family:Arial,sans-serif;font-size:13px;color:#77706A">The link expires one hour after it was sent. If you did not ask for it, you can ignore this email.</p>`),
  });
}

function escapeHtml(text = '') {
  return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
