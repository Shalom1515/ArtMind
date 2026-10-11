import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { COOKIE_NAME } from '../config/constants.js';
import { Session, User } from '../models/index.js';
import { sendResetLink, sendVerificationCode } from '../services/mail.js';
import { ApiError } from '../utils/ApiError.js';
import { validateEmail, validateLogin, validateRegister, validateReset, validateVerify } from '../validators/auth.js';

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;
const CODE_LIFETIME = 15 * MINUTE;
const RESEND_WAIT = MINUTE;
const MAX_ATTEMPTS = 5;
const RESET_LIFETIME = 60 * MINUTE;

const sha256 = (text) => crypto.createHash('sha256').update(String(text)).digest('hex');
const sixDigits = () => String(crypto.randomInt(100000, 1000000));

async function issueCode(user) {
  const code = sixDigits();
  user.verification = { codeHash: sha256(code), expiresAt: new Date(Date.now() + CODE_LIFETIME), attempts: 0, lastSentAt: new Date() };
  await user.save();
  await sendVerificationCode(user.email, user.name, code);
}

async function startSession(req, res, user, remember) {
  const lifetime = remember ? 30 * DAY : DAY;
  const session = await Session.create({
    user: user._id,
    remember,
    userAgent: String(req.get('user-agent') || '').slice(0, 300),
    ip: req.ip || '',
    expiresAt: new Date(Date.now() + lifetime),
  });
  const token = jwt.sign({ sid: session._id.toString() }, config.jwtSecret, { expiresIn: Math.floor(lifetime / 1000) });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: !config.isDev && !config.isTest,
    path: '/',
    ...(remember ? { maxAge: lifetime } : {}),
  });
  user.lastActiveAt = new Date();
  await user.save();
}

function clearCookie(res) {
  res.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite: 'lax', secure: !config.isDev && !config.isTest, path: '/' });
}

export async function register(req, res) {
  const { name, email, password, interests } = validateRegister(req.body);
  let user = await User.findOne({ email });
  if (user?.verified) {
    throw new ApiError(409, 'An account with that email already exists. Try logging in.', 'CONFLICT', { email: 'This email is already registered.' });
  }
  const passwordHash = await bcrypt.hash(password, 12);
  if (user) Object.assign(user, { name, passwordHash, interests });
  else user = new User({ name, email, passwordHash, interests, joinedAt: new Date() });
  await issueCode(user);
  res.status(201).json({ email, message: `We sent a six digit code to ${email}.` });
}

export async function verify(req, res) {
  const { email, code } = validateVerify(req.body);
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
    if (sha256(code) !== v.codeHash) {
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
  const email = validateEmail(req.body);
  const user = await User.findOne({ email });
  if (user && !user.verified) {
    const last = user.verification?.lastSentAt;
    if (last && Date.now() - last.getTime() < RESEND_WAIT) {
      throw new ApiError(429, 'Please wait a minute before asking for another code.', 'RATE_LIMITED');
    }
    await issueCode(user);
  }
  res.json({ message: 'A new code is on its way.', retryAfter: RESEND_WAIT / 1000 });
}

export async function login(req, res) {
  const { email, password, remember } = validateLogin(req.body);
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
  if (req.session) await Session.deleteOne({ _id: req.session._id });
  clearCookie(res);
  res.json({ message: 'Logged out.' });
}

export async function forgot(req, res) {
  const email = validateEmail(req.body);
  const user = await User.findOne({ email });
  if (user && user.active) {
    const token = crypto.randomBytes(32).toString('hex');
    user.reset = { tokenHash: sha256(token), expiresAt: new Date(Date.now() + RESET_LIFETIME) };
    await user.save();
    await sendResetLink(user.email, user.name, `${config.clientUrl.replace(/\/$/, '')}/reset/${token}`);
  }
  res.json({ message: 'If that email is registered, a reset link is on its way.' });
}

export async function reset(req, res) {
  const { token, password } = validateReset(req.body);
  const user = await User.findOne({ 'reset.tokenHash': sha256(token), 'reset.expiresAt': { $gt: new Date() } });
  if (!user) throw ApiError.badRequest('This reset link has expired or was already used. Ask for a new one.');
  user.passwordHash = await bcrypt.hash(password, 12);
  user.reset = undefined;
  await user.save();
  await Session.deleteMany({ user: user._id });
  res.json({ message: 'Your password has been changed. You can log in now.' });
}

export async function me(req, res) {
  if (req.user) {
    req.user.lastActiveAt = new Date();
    await req.user.save();
  }
  res.json({ user: req.user ? req.user.toPublic() : null });
}
