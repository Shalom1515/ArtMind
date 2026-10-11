import { Conversation } from '../models/index.js';
import { answer, SUGGESTIONS, titleFor } from '../services/assistant/index.js';
import { cardsInOrder } from '../services/catalogue/index.js';
import { ApiError } from '../utils/ApiError.js';

export function suggestions(req, res) {
  res.json({ items: SUGGESTIONS });
}

const toMessage = (m, paintings) => ({
  id: String(m._id),
  role: m.role,
  text: m.text,
  paintings,
  followUps: m.followUps || [],
  createdAt: m.createdAt,
});

export async function sendMessage(req, res) {
  const { message, conversationId } = req.body;
  const context = req.body.context || {};
  let conversation = null;
  let history = (req.body.history || []).slice(-10);

  if (req.user) {
    if (conversationId) conversation = await Conversation.findOne({ _id: conversationId, user: req.user._id });
    if (!conversation) conversation = new Conversation({ user: req.user._id, title: titleFor(message), context, messages: [] });
    history = conversation.messages.slice(-10).map((m) => ({ role: m.role, text: m.text, paintings: m.paintings }));
  }

  const reply = await answer({ message, context: { ...(conversation?.context?.toObject?.() || {}), ...context }, history });
  const now = new Date();

  if (conversation) {
    conversation.messages.push({ role: 'user', text: message, paintings: [], followUps: [], createdAt: now });
    conversation.messages.push({ role: 'assistant', text: reply.text, paintings: reply.paintings.map((p) => p.slug), followUps: reply.followUps, createdAt: now });
    await conversation.save();
    const saved = conversation.messages[conversation.messages.length - 1];
    return res.json({ conversationId: String(conversation._id), reply: toMessage(saved, reply.paintings) });
  }
  res.json({
    conversationId: null,
    reply: { id: `m${now.getTime().toString(36)}`, role: 'assistant', text: reply.text, paintings: reply.paintings, followUps: reply.followUps, createdAt: now.toISOString() },
  });
}

export async function listConversations(req, res) {
  const rows = await Conversation.find({ user: req.user._id }).sort({ updatedAt: -1 }).select('title updatedAt').limit(50).lean();
  res.json({ items: rows.map((c) => ({ id: String(c._id), title: c.title, updatedAt: c.updatedAt })) });
}

async function myConversation(req) {
  const found = await Conversation.findOne({ _id: req.params.id, user: req.user._id });
  if (!found) throw ApiError.notFound('We could not find that conversation.');
  return found;
}

export async function getConversation(req, res) {
  const c = await myConversation(req);
  const cards = await cardsInOrder([...new Set(c.messages.flatMap((m) => m.paintings))]);
  const bySlug = new Map(cards.map((card) => [card.slug, card]));
  res.json({
    conversation: {
      id: String(c._id),
      title: c.title,
      messages: c.messages.map((m) => toMessage(m, m.paintings.map((s) => bySlug.get(s)).filter(Boolean))),
    },
  });
}

export async function deleteConversation(req, res) {
  const c = await myConversation(req);
  await c.deleteOne();
  res.status(204).end();
}
