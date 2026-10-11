import { z } from 'zod';
import { objectId } from './common.js';

const historyItem = z.object({
  role: z.enum(['user', 'assistant']),
  text: z.string().max(4000).catch(''),
  paintings: z.array(z.union([z.string().max(160), z.object({ slug: z.string().max(160) }).passthrough()])).max(10).optional().catch([]),
}).passthrough();

export const messageSchema = z.object({
  conversationId: objectId.nullable().optional().catch(null),
  message: z.string({ error: 'Type a question first.' }).trim().min(1, 'Type a question first.').max(1000, 'Please keep it under 1000 characters.'),
  context: z.object({
    paintingSlug: z.string().trim().max(160).optional().catch(undefined),
    query: z.string().trim().max(200).optional().catch(undefined),
  }).optional().nullable().catch(null),
  history: z.array(historyItem).max(50).optional().catch([]),
});
