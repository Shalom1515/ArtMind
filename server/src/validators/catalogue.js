import { z } from 'zod';
import { commaList, pageQuery } from './common.js';

const year = z.coerce.number().int().min(1000).max(2100).optional().catch(undefined);
const sorts = { newest: 'newest', oldest: 'oldest', title: 'title', popular: 'popular', views: 'popular', mostViewed: 'popular' };

export const paintingsQuery = z.object({
  category: commaList(),
  style: commaList(),
  medium: commaList(),
  surface: commaList(),
  colour: commaList(),
  dominantColour: commaList(),
  mood: commaList(),
  artist: z.string().trim().max(120).optional(),
  yearFrom: year,
  yearTo: year,
  featured: z.enum(['true', 'false']).optional().catch(undefined),
  q: z.string().trim().max(200).optional(),
  sort: z.string().optional().transform((v) => sorts[v] || 'newest'),
  ...pageQuery,
});

export const limitQuery = z.object({
  limit: z.coerce.number().int().min(1).max(24).optional().catch(undefined),
});

export const artistsQuery = z.object({
  q: z.string().trim().max(80).optional(),
  letter: z.string().trim().max(3).optional(),
});

export const downloadQuery = z.object({
  format: z.enum(['pdf', 'docx']).optional().default('pdf').catch('pdf'),
});
