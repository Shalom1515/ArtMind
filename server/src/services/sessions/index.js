import jwt from 'jsonwebtoken';
import { config } from '../../config/env.js';
import { COOKIE_NAME } from '../../config/constants.js';
import { Session } from '../../models/index.js';

const DAY = 24 * 60 * 60 * 1000;
const REMEMBER_LIFETIME = 30 * DAY;
const BROWSER_LIFETIME = 7 * DAY;

const cookieOptions = () => ({ httpOnly: true, sameSite: 'lax', secure: config.isProduction, path: '/' });

export async function startSession(req, res, user, remember = false) {
  const lifetime = remember ? REMEMBER_LIFETIME : BROWSER_LIFETIME;
  const session = await Session.create({
    user: user._id,
    remember,
    userAgent: String(req.get('user-agent') || '').slice(0, 300),
    ip: req.ip || '',
    lastSeenAt: new Date(),
    expiresAt: new Date(Date.now() + lifetime),
  });
  const token = jwt.sign({ sub: String(user._id), sid: String(session._id) }, config.jwtSecret, { expiresIn: Math.floor(lifetime / 1000) });
  // Without remember me the cookie has no max age, so it ends when the browser closes.
  res.cookie(COOKIE_NAME, token, { ...cookieOptions(), ...(remember ? { maxAge: lifetime } : {}) });
  user.lastActiveAt = new Date();
  await user.save();
  return session;
}

export function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, cookieOptions());
}

export async function endAllSessions(userId) {
  const { deletedCount } = await Session.deleteMany({ user: userId });
  return deletedCount;
}

export async function endOtherSessions(userId, keepSessionId) {
  const { deletedCount } = await Session.deleteMany({ user: userId, _id: { $ne: keepSessionId } });
  return deletedCount;
}
