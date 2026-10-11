import { existsSync } from 'node:fs';
import { unlink, writeFile } from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import sharp from 'sharp';
import { ensureFolder, storage } from '../config/storage.js';
import {
  ContactMessage, Conversation, Favourite, SearchLog, User, ViewEvent,
} from '../models/index.js';
import { insights, refreshTaste } from '../services/analytics/index.js';
import { sendFile, TYPES } from '../services/documents/index.js';
import { recommendFor } from '../services/recommendations/index.js';
import { clearSessionCookie, endAllSessions, endOtherSessions } from '../services/sessions/index.js';
import { ApiError } from '../utils/ApiError.js';
import { BCRYPT_ROUNDS } from './authController.js';

async function removeAvatarFile(url) {
  if (!url || !url.startsWith('/uploads/avatars/')) return;
  const file = path.join(storage.avatars, path.basename(url));
  if (existsSync(file)) await unlink(file).catch(() => {});
}

export async function updateDetails(req, res) {
  for (const key of ['name', 'bio', 'country']) if (req.body[key] !== undefined) req.user[key] = req.body[key];
  await req.user.save();
  res.json({ user: req.user.toPublic() });
}

export async function uploadPhoto(req, res) {
  if (!req.file) throw ApiError.badRequest('Choose a photo first.', { photo: 'Choose a photo first.' });
  let data;
  try {
    data = await sharp(req.file.buffer).rotate().resize(400, 400, { fit: 'cover', position: 'attention' }).jpeg({ quality: 85 }).toBuffer();
  } catch {
    throw ApiError.badRequest('We could not read that photo.', { photo: 'We could not read that photo.' });
  }
  const name = `${req.user._id}_${crypto.randomBytes(4).toString('hex')}.jpg`;
  await writeFile(path.join(ensureFolder(storage.avatars), name), data);
  const old = req.user.avatar;
  req.user.avatar = `/uploads/avatars/${name}`;
  await req.user.save();
  await removeAvatarFile(old);
  res.json({ user: req.user.toPublic() });
}

export async function updateInterests(req, res) {
  req.user.interests = req.body.interests;
  req.user.tasteSummary = '';
  await req.user.save();
  res.json({ user: req.user.toPublic() });
}

async function checkPassword(user, password, field) {
  const withHash = await User.findById(user._id).select('+passwordHash');
  const matches = withHash ? await bcrypt.compare(password, withHash.passwordHash) : false;
  if (!matches) {
    throw ApiError.badRequest(undefined, { [field]: field === 'currentPassword' ? 'Your current password is not right.' : 'That password is not right.' });
  }
  return withHash;
}

export async function changePassword(req, res) {
  const user = await checkPassword(req.user, req.body.currentPassword, 'currentPassword');
  user.passwordHash = await bcrypt.hash(req.body.newPassword, BCRYPT_ROUNDS);
  await user.save();
  await endOtherSessions(user._id, req.authSession._id);
  res.json({ message: 'Password changed.' });
}

export async function signOutOthers(req, res) {
  res.json({ signedOut: await endOtherSessions(req.user._id, req.authSession._id) });
}

export async function exportData(req, res) {
  const user = req.user;
  const [favourites, views, searches, conversations, messages] = await Promise.all([
    Favourite.find({ user: user._id }).populate('painting', 'slug title').lean(),
    ViewEvent.find({ user: user._id }).sort({ createdAt: -1 }).populate('painting', 'slug title').lean(),
    SearchLog.find({ user: user._id }).sort({ createdAt: -1 }).lean(),
    Conversation.find({ user: user._id }).sort({ updatedAt: -1 }).lean(),
    ContactMessage.find({ email: user.email }).sort({ createdAt: -1 }).lean(),
  ]);
  const data = {
    profile: user.toPublic(),
    interests: user.interests,
    favourites: favourites.filter((f) => f.painting).map((f) => ({ slug: f.painting.slug, title: f.painting.title, savedAt: f.createdAt })),
    views: views.filter((v) => v.painting).map((v) => ({ slug: v.painting.slug, title: v.painting.title, at: v.createdAt })),
    searches: searches.map((s) => ({ query: s.query, results: s.resultCount, at: s.createdAt })),
    conversations: conversations.map((c) => ({
      title: c.title,
      updatedAt: c.updatedAt,
      messages: c.messages.map((m) => ({ role: m.role, text: m.text, paintings: m.paintings, at: m.createdAt })),
    })),
    messages: messages.map((m) => ({ subject: m.subject, message: m.message, status: m.status, at: m.createdAt })),
    exportedAt: new Date().toISOString(),
  };
  sendFile(res, Buffer.from(JSON.stringify(data, null, 2)), 'artmind_my_data.json', TYPES.json);
}

export async function deleteAccount(req, res) {
  const user = await checkPassword(req.user, req.body.password, 'password');
  if (user.role === 'admin' && (await User.countDocuments({ role: 'admin' })) <= 1) {
    throw ApiError.conflict('You are the last admin. Make someone else an admin first.');
  }
  await Promise.all([
    Favourite.deleteMany({ user: user._id }),
    ViewEvent.deleteMany({ user: user._id }),
    SearchLog.deleteMany({ user: user._id }),
    Conversation.deleteMany({ user: user._id }),
    endAllSessions(user._id),
  ]);
  await removeAvatarFile(user.avatar);
  await User.deleteOne({ _id: user._id });
  clearSessionCookie(res);
  res.status(204).end();
}

export async function getInsights(req, res) {
  res.json(await insights(req.user));
}

export async function newTaste(req, res) {
  res.json({ taste: await refreshTaste(req.user) });
}

export async function recommendations(req, res) {
  res.json({ items: await recommendFor(req.user, req.query.limit || 8) });
}

export async function contact(req, res) {
  await ContactMessage.create({ ...req.body, status: 'new', user: req.user?._id || null });
  res.status(201).json({ message: 'Thank you. We will reply within two working days.' });
}
