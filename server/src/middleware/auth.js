import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { COOKIE_NAME } from '../config/constants.js';
import { isDbConnected } from '../config/db.js';
import { Session, User } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';

export async function loadUser(req, res, next) {
  req.user = null;
  req.session = null;
  const token = req.cookies?.[COOKIE_NAME];
  if (!token || !isDbConnected()) return next();

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const session = await Session.findById(payload.sid);
    if (!session || session.expiresAt < new Date()) return next();
    const user = await User.findById(session.user);
    if (!user || !user.active) return next();
    req.user = user;
    req.session = session;
  } catch {
  }
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
