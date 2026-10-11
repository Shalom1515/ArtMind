import crypto from 'node:crypto';
import { config } from '../config/env.js';
import { GUEST_COOKIE } from '../config/constants.js';

const YEAR = 365 * 24 * 60 * 60 * 1000;

export function guestId(req, res, next) {
  let id = req.cookies?.[GUEST_COOKIE];
  if (!id || !/^[a-f0-9]{32}$/.test(id)) {
    id = crypto.randomBytes(16).toString('hex');
    res.cookie(GUEST_COOKIE, id, { httpOnly: true, sameSite: 'lax', secure: config.isProduction, maxAge: YEAR, path: '/' });
  }
  req.guestId = id;
  next();
}
