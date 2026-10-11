import rateLimit from 'express-rate-limit';
import { config } from '../config/env.js';

function limiter(windowMinutes, limit, message) {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => config.isTest,
    handler: (req, res) => res.status(429).json({ error: { message, code: 'RATE_LIMITED' } }),
  });
}

export const authLimiter = limiter(15, 30, 'Too many attempts. Please wait a few minutes and try again.');
export const assistantLimiter = limiter(1, 20, 'You are sending messages very fast. Please wait a moment.');
export const contactLimiter = limiter(60, 5, 'You have sent a lot of messages. Please try again later.');
export const uploadLimiter = limiter(10, 30, 'Too many uploads. Please wait a few minutes.');
