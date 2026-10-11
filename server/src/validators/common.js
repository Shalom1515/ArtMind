import { z } from 'zod';

export const isEmail = (value = '') => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value).trim());

export function passwordProblem(password = '') {
  if (String(password).length < 8) return 'Use at least eight characters.';
  if (!/[A-Za-z]/.test(password)) return 'Add at least one letter.';
  if (!/\d/.test(password)) return 'Add at least one number.';
  return '';
}

export const emailField = z
  .string({ error: 'Enter a valid email address.' })
  .trim()
  .toLowerCase()
  .max(254, 'Enter a valid email address.')
  .refine(isEmail, 'Enter a valid email address.');

export const newPassword = z.string({ error: 'Use at least eight characters.' }).max(200, 'Use fewer than 200 characters.').superRefine((value, ctx) => {
  const problem = passwordProblem(value);
  if (problem) ctx.addIssue({ code: 'custom', message: problem });
});

export const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'That id is not valid.');
// Ids that are not valid simply find nothing and answer 404, as the mock does.
export const idParams = z.object({ id: z.string().trim().min(1).max(64) });
export const slugParams = z.object({ slug: z.string().trim().min(1).max(160) });

const listText = (max = 400) => z.string().trim().max(max).optional();
export const commaList = listText;
export const splitList = (value) => (value ? String(value).split(',').map((v) => v.trim()).filter(Boolean) : []);

export const pageQuery = {
  page: z.coerce.number().int().min(1).max(10000).optional().catch(undefined),
  limit: z.coerce.number().int().min(1).max(60).optional().catch(undefined),
};

export const boolText = z.union([z.boolean(), z.enum(['true', 'false'])]).transform((v) => v === true || v === 'true');

export function paginate(total, query, defaultLimit = 12, maxLimit = 60) {
  const limit = Math.min(Math.max(Number(query.limit) || defaultLimit, 1), maxLimit);
  const pages = Math.max(1, Math.ceil(total / limit));
  const page = Math.min(Math.max(Number(query.page) || 1, 1), pages);
  return { page, limit, pages, skip: (page - 1) * limit, total };
}

export function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
