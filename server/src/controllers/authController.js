import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { config } from '../config/env.js';
import { Session, User } from '../models/index.js';
import { sendResetLink, sendVerificationCode } from '../services/mail/index.js';
import { clearSessionCookie, endAllSessions, startSession } from '../services/sessions/index.js';
import { ApiError } from '../utils/ApiError.js';

const MINUTE = 60 * 1000;
const CODE_LIFETIME = 10 * MINUTE;
const RESEND_WAIT = MINUTE;
const MAX_ATTEMPTS = 5;
const RESET_LIFETIME = 60 * MINUTE;
export const BCRYPT_ROUNDS = 12;

const sha256 = (text) => crypto.createHash('sha256').update(String(text)).digest('hex');
const sixDigits = () => String(crypto.randomInt(100000, 1000000));

async function issueCode(user) {
  const code = sixDigits();
  user.verification = { codeHash: sha256(code), expiresAt: new Date(Date.now() + CODE_LIFETIME), attempts: 0, lastSentAt: new Date() };
  await user.save();
  await sendVerificationCode(user.email, user.name, code);
}

export async function register(req, res) {
  const { name, email, password, interests } = req.body;
  let user = await User.findOne({ email });
  if (user?.verified) {
    throw new ApiError(409, 'An account with that email already exists. Try logging in.', 'CONFLICT', { email: 'This email is already registered.' });
  }
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  if (user) Object.assign(user, { name, passwordHash, interests });
  else user = new User({ name, email, passwordHash, interests, joinedAt: new Date() });
  await issueCode(user);
  res.status(201).json({ email, message: `We sent a six digit code to ${email}.` });
}

export async function verify(req, res) {
  const { email, code } = req.body;
  const user = await User.findOne({ email }).select('+verification.codeHash');
  if (!user) throw ApiError.badRequest('That code is not right.', { code: 'That code is not right.' });
  if (!user.active) throw ApiError.forbidden('This account has been deactivated.');

  if (!user.verified) {
    const v = user.verification || {};
    if (!v.codeHash || !v.expiresAt || v.expiresAt < new Date()) {
      throw ApiError.badRequest('That code has expired. Ask for a new one.', { code: 'That code has expired.' });
    }
    if (v.attempts >= MAX_ATTEMPTS) {
      throw ApiError.badRequest('Too many wrong tries. Ask for a new code.', { code: 'Ask for a new code.' });
    }
    const matches = crypto.timingSafeEqual(Buffer.from(sha256(code)), Buffer.from(v.codeHash));
    if (!matches) {
      user.verification.attempts = (v.attempts || 0) + 1;
      await user.save();
      throw ApiError.badRequest('That code is not right.', { code: 'That code is not right.' });
    }
    user.verified = true;
    user.verification = undefined;
  }

  await startSession(req, res, user, false);
  res.json({ user: user.toPublic() });
}

export async function resend(req, res) {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (user && !user.verified && user.active) {
    const last = user.verification?.lastSentAt;
    if (last && Date.now() - last.getTime() < RESEND_WAIT) {
      throw new ApiError(429, 'Please wait a minute before asking for another code.', 'RATE_LIMITED');
    }
    await issueCode(user);
  }
  res.json({ message: 'A new code is on its way.', retryAfter: RESEND_WAIT / 1000 });
}

export async function login(req, res) {
  const { email, password, remember } = req.body;
  const user = await User.findOne({ email }).select('+passwordHash');
  const matches = user ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!user || !matches) throw new ApiError(401, 'Email or password is not right.', 'UNAUTHENTICATED');
  if (!user.active) throw ApiError.forbidden('This account has been deactivated. Contact us if you think this is a mistake.');
  if (!user.verified) {
    const v = user.verification;
    const stillValid = v?.expiresAt && v.expiresAt > new Date();
    if (!stillValid) await issueCode(user);
    throw ApiError.forbidden('Please verify your email first. We sent you a code.', 'NOT_VERIFIED');
  }
  await startSession(req, res, user, remember);
  res.json({ user: user.toPublic() });
}

export async function logout(req, res) {
  if (req.authSession) await Session.deleteOne({ _id: req.authSession._id });
  clearSessionCookie(res);
  res.json({ message: 'Logged out.' });
}

export async function forgot(req, res) {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (user && user.active) {
    const token = crypto.randomBytes(32).toString('hex');
    user.reset = { tokenHash: sha256(token), expiresAt: new Date(Date.now() + RESET_LIFETIME) };
    await user.save();
    await sendResetLink(user.email, user.name, `${config.clientUrl}/reset/${token}`);
  }
  res.json({ message: 'If that email is registered, a reset link is on its way.' });
}

export async function reset(req, res) {
  const { token, password } = req.body;
  const user = await User.findOne({ 'reset.tokenHash': sha256(token), 'reset.expiresAt': { $gt: new Date() } });
  if (!user) throw ApiError.badRequest('This reset link has expired or was already used. Ask for a new one.', { token: 'This reset link has expired or was already used.' });
  user.passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  user.reset = undefined;
  await user.save();
  await endAllSessions(user._id);
  res.json({ message: 'Your password has been changed. You can log in now.' });
}

export function me(req, res) {
  res.json({ user: req.user ? req.user.toPublic() : null });
}
