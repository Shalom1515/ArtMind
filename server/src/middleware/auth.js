import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { COOKIE_NAME } from '../config/constants.js';
import { isDbConnected } from '../config/db.js';
import { Session, User } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';

const FIVE_MINUTES = 5 * 60 * 1000;

export async function loadUser(req, res, next) {
  req.user = null;
  req.authSession = null;
  const token = req.cookies?.[COOKIE_NAME];
  if (!token || !isDbConnected()) return next();

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    return next();
  }

  const session = await Session.findById(payload.sid);
  if (!session || session.expiresAt < new Date() || String(session.user) !== String(payload.sub)) return next();
  const user = await User.findById(session.user);
  if (!user || !user.active) return next();

  const now = Date.now();
  if (!session.lastSeenAt || now - session.lastSeenAt.getTime() > FIVE_MINUTES) {
    await Session.updateOne({ _id: session._id }, { lastSeenAt: new Date(now) });
    await User.updateOne({ _id: user._id }, { lastActiveAt: new Date(now) });
    user.lastActiveAt = new Date(now);
  }
  req.user = user;
  req.authSession = session;
  next();
}

export function requireUser(req, res, next) {
  if (!req.user) return next(ApiError.unauthenticated());
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user) return next(ApiError.unauthenticated());
  if (req.user.role !== 'admin') return next(ApiError.forbidden('Only admins can do that.'));
  next();
}
