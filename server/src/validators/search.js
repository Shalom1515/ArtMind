import { z } from 'zod';
import { pageQuery, splitList } from './common.js';

export const searchQuery = z.object({
  q: z.string({ error: 'Type what you would like to see.' }).trim().min(1, 'Type what you would like to see.').transform((v) => v.slice(0, 200)),
  exclude: z.string().max(1000).optional().transform((v) => splitList(v)),
  sort: z.enum(['best', 'newest', 'oldest']).optional().default('best').catch('best'),
  ...pageQuery,
});
