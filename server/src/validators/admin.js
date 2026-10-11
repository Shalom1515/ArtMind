import { z } from 'zod';
import { CATEGORIES, MEDIUMS, MOODS, SURFACES } from '../config/constants.js';
import { pageQuery } from './common.js';

const thisYear = () => new Date().getFullYear();

const jsonArray = (item, message) => z.preprocess((value) => {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === '') return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}, z.array(item, { error: message }).optional());

const number = (message, min, max) => z.preprocess(
  (v) => (v === '' || v === undefined || v === null ? undefined : Number(v)),
  z.number({ error: message }).int(message).min(min, message).max(max, message),
);

export const paintingSchema = z.object({
  title: z.string({ error: 'Enter a title.' }).trim().min(1, 'Enter a title.').max(120, 'Keep the title under 120 characters.'),
  artistSlug: z.string({ error: 'Choose an artist.' }).trim().min(1, 'Choose an artist.').max(120),
  year: z.preprocess((v) => (v === '' || v == null ? undefined : Number(v)), z.number({ error: 'Enter a year.' }).int('Enter a year.').min(1000, 'Enter a year.').refine((v) => v <= thisYear(), 'Enter a year.')),
  category: z.enum(CATEGORIES, { error: 'Choose a category.' }),
  style: z.string({ error: 'Choose a style.' }).trim().min(1, 'Choose a style.').max(60),
  medium: z.enum(MEDIUMS, { error: 'Choose a medium.' }),
  surface: z.enum(SURFACES, { error: 'Choose a surface.' }),
  widthCm: number('Enter the width.', 1, 2000),
  heightCm: number('Enter the height.', 1, 2000),
  mood: z.preprocess((v) => (v === '' ? undefined : v), z.enum(MOODS, { error: 'Choose a mood.' }).optional()),
  description: z.string().trim().max(2000, 'Keep it under 2000 characters.').optional(),
  summary: z.string().trim().max(600, 'Keep it under 600 characters.').optional(),
  featured: z.preprocess((v) => (v === undefined ? undefined : v === true || v === 'true'), z.boolean().optional()),
  tags: jsonArray(z.string().trim().min(1).max(40), 'Add tags as a list.').transform((list) => (list ? [...new Set(list.map((t) => t.toLowerCase()))].slice(0, 12) : list)),
  palette: jsonArray(z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Use colours like #A33A2C.'), 'Add the palette as a list.').transform((list) => (list ? list.map((c) => c.toUpperCase()).slice(0, 6) : list)),
});

export const paintingUpdateSchema = paintingSchema.partial();

export const adminPaintingsQuery = z.object({
  q: z.string().trim().max(120).optional(),
  category: z.enum(CATEGORIES).optional().catch(undefined),
  sort: z.enum(['popular', 'newest', 'oldest', 'title']).optional().catch(undefined),
  ...pageQuery,
});

export const featuredSchema = z.object({ featured: z.boolean({ error: 'Send true or false.' }) });

export const generateSchema = z.object({
  id: z.string().trim().max(64).optional(),
  title: z.string().trim().max(120).optional(),
  medium: z.string().trim().max(40).optional(),
  surface: z.string().trim().max(40).optional(),
  artistSlug: z.string().trim().max(120).optional(),
});

export const artistSchema = z.object({
  name: z.string({ error: 'Enter a name.' }).trim().min(2, 'Enter a name.').max(80, 'Enter a name.'),
  country: z.string({ error: 'Choose a country.' }).trim().min(1, 'Choose a country.').max(60),
  bornYear: z.preprocess((v) => (v === '' || v == null ? undefined : Number(v)), z.number({ error: 'Enter a birth year.' }).int('Enter a birth year.').min(1800, 'Enter a birth year.').refine((v) => v <= thisYear(), 'Enter a birth year.')),
  bio: z.string().trim().max(4000, 'Keep the bio under 4000 characters.').optional(),
  styles: jsonArray(z.string().trim().min(1).max(60), 'Add styles as a list.'),
});

export const artistUpdateSchema = artistSchema.partial();

export const collectionSchema = z.object({
  title: z.string({ error: 'Enter a title.' }).trim().min(1, 'Enter a title.').max(80),
  shortLine: z.string().trim().max(160).optional(),
  description: z.string().trim().max(1000).optional(),
  paintings: z.array(z.string().trim().max(160), { error: 'Choose between four and eight paintings.' }),
  order: z.coerce.number().int().min(0).max(1000).optional(),
});

export const collectionUpdateSchema = collectionSchema.partial();

export const usersQuery = z.object({ q: z.string().trim().max(120).optional(), ...pageQuery });
export const roleSchema = z.object({ role: z.enum(['user', 'admin'], { error: 'Choose user or admin.' }) });
export const activeSchema = z.object({ active: z.boolean({ error: 'Send true or false.' }) });

export const messagesQuery = z.object({ status: z.enum(['new', 'read', 'replied']).optional().catch(undefined) });
export const messageStatusSchema = z.object({ status: z.enum(['new', 'read', 'replied'], { error: 'Choose new, read or replied.' }) });

export const overviewQuery = z.object({
  days: z.coerce.number().optional().transform((v) => ([7, 30, 90].includes(v) ? v : 30)),
});
