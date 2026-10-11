import { z } from 'zod';
import { CATEGORIES } from '../config/constants.js';
import { emailField, newPassword } from './common.js';

export { isEmail, passwordProblem } from './common.js';

export const registerSchema = z.object({
  name: z.string({ error: 'Enter your full name.' }).trim().min(2, 'Enter your full name.').max(60, 'Enter your full name.'),
  email: emailField,
  password: newPassword,
  interests: z
    .array(z.string(), { error: 'Pick three categories.' })
    .transform((list) => [...new Set(list.filter((c) => CATEGORIES.includes(c)))])
    .refine((list) => list.length === 3, 'Pick three categories.'),
  agree: z.literal(true, { error: 'Please agree to the terms to continue.' }),
});

export const emailSchema = z.object({ email: emailField });

export const verifySchema = z.object({
  email: emailField,
  code: z.string({ error: 'Enter the six digit code.' }).trim().regex(/^\d{6}$/, 'Enter the six digit code.'),
});

export const loginSchema = z.object({
  email: z.string({ error: 'Enter your email address.' }).trim().toLowerCase().min(1, 'Enter your email address.').max(254),
  password: z.string({ error: 'Enter your password.' }).min(1, 'Enter your password.').max(200),
  remember: z.boolean().optional().default(false),
});

export const resetSchema = z.object({
  token: z.string({ error: 'This reset link is not complete.' }).trim().regex(/^[a-f0-9]{64}$/, 'This reset link is not complete.'),
  password: newPassword,
});
