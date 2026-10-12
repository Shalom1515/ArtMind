import rateLimit from 'express-rate-limit';
import { config } from '../config/env.js';

function limiter(windowMinutes, limit, message) {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => config.isTest && !limiterState.inTests,
    handler: (req, res) => res.status(429).json({ error: { message, code: 'RATE_LIMITED' } }),
  });
}

// Tests turn this on when they want to check a limit.
export const limiterState = { inTests: false };

export const authLimiter = limiter(15, 20, 'Too many attempts. Please wait a few minutes and try again.');
export const searchLimiter = limiter(1, 60, 'You are searching very fast. Please wait a moment.');
export const suggestLimiter = limiter(1, 300, 'You are typing very fast. Please wait a moment.');
export const identifyLimiter = limiter(1, 10, 'Too many images in a short time. Please wait a minute.');
export const assistantLimiter = limiter(1, 20, 'You are sending messages very fast. Please wait a moment.');
export const contactLimiter = limiter(60, 5, 'You have sent a lot of messages. Please try again later.');
