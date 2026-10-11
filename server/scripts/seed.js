import { readFile } from 'node:fs/promises';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { config } from '../src/config/env.js';
import {
  Artist, Collection, ContactMessage, Conversation, Favourite, Painting, SearchLog, Session, User, ViewEvent,
} from '../src/models/index.js';

const readSeed = async (name) => JSON.parse(await readFile(path.join(config.paths.seed, name), 'utf8'));

function makeRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function fail(message) {
  console.error(`\n${message}\n`);
  process.exit(1);
}

async function main() {
  if (!config.mongoUri) fail('MONGODB_URI is missing in server/.env. Add your Atlas connection string and run npm run seed again.');

  const [artists, paintings, collections, users] = await Promise.all([
    readSeed('artists.json'), readSeed('paintings.json'), readSeed('collections.json'), readSeed('users.json'),
  ]);

  for (const u of users) {
    if (!process.env[u.passwordEnv]) fail(`${u.passwordEnv} is missing in server/.env. Set it before seeding.`);
  }

  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 10000 });
  console.log(`Connected to ${mongoose.connection.name}`);

  await Promise.all([
    User, Artist, Painting, Collection, Favourite, ViewEvent, SearchLog, Conversation, ContactMessage, Session,
  ].map((model) => model.deleteMany({})));
  console.log('Cleared old data');

  const artistDocs = await Artist.insertMany(artists);
  const artistBySlug = new Map(artistDocs.map((a) => [a.slug, a]));
  console.log(`Artists: ${artistDocs.length}`);

  const paintingDocs = await Painting.insertMany(paintings.map((p) => {
    const artist = artistBySlug.get(p.artistSlug);
    if (!artist) throw new Error(`Unknown artist ${p.artistSlug} on ${p.slug}`);
    return { ...p, artist: artist._id };
  }));
  const paintingBySlug = new Map(paintingDocs.map((p) => [p.slug, p]));
  console.log(`Paintings: ${paintingDocs.length}`);

  const collectionDocs = await Collection.insertMany(collections.map((c) => ({
    ...c,
    paintings: c.paintings.map((slug) => {
      const painting = paintingBySlug.get(slug);
      if (!painting) throw new Error(`Unknown painting ${slug} in collection ${c.slug}`);
      return painting._id;
    }),
  })));
  console.log(`Collections: ${collectionDocs.length}`);

  const userDocs = [];
  for (const u of users) {
    const { passwordEnv, ...rest } = u;
    const passwordHash = await bcrypt.hash(process.env[passwordEnv], 12);
    userDocs.push(await User.create({ ...rest, passwordHash, lastActiveAt: new Date() }));
  }
  console.log(`Users: ${userDocs.map((u) => u.email).join(', ')}`);

  await seedActivity(userDocs.find((u) => u.role === 'user'), paintingDocs, paintingBySlug);

  await mongoose.disconnect();
  console.log('\nDone. You can log in with the demo accounts now.');
}

async function seedActivity(ada, paintingDocs, paintingBySlug) {
  const random = makeRandom(20261010);
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const pick = (list) => list[Math.floor(random() * list.length)];

  const weighted = paintingDocs.flatMap((p) => Array(p.featured ? 6 : p.heroOfDay ? 8 : 2).fill(p));
  const views = [];
  for (let d = 29; d >= 0; d -= 1) {
    const count = 20 + Math.round((29 - d) * 1.6 + random() * 18);
    for (let i = 0; i < count; i += 1) {
      const painting = pick(weighted);
      views.push({ painting: painting._id, category: painting.category, visitorId: `demo${i % 40}`, createdAt: new Date(now - d * day - random() * day) });
    }
  }
  const adaLikes = paintingDocs.filter((p) => ada.interests.includes(p.category));
  for (let i = 0; i < 38; i += 1) {
    const painting = pick(adaLikes);
    views.push({ painting: painting._id, category: painting.category, user: ada._id, createdAt: new Date(now - random() * 20 * day) });
  }
  await ViewEvent.insertMany(views);
  console.log(`Sample views: ${views.length}`);

  const queries = [
    'calm landscapes', 'flowers in oil', 'abstract with warm colours', 'religious paintings on wood panel',
    'impressionist paintings', 'birds by the water', 'paintings with gold leaf', 'ink wash nature', 'portraits of people at work',
  ];
  const searches = [];
  for (let d = 29; d >= 0; d -= 1) {
    const count = 4 + Math.round(random() * 8 + (29 - d) * 0.3);
    for (let i = 0; i < count; i += 1) {
      const query = queries[Math.min(queries.length - 1, Math.floor(random() * random() * queries.length))];
      searches.push({ query, normalised: query, resultCount: 8, createdAt: new Date(now - d * day - random() * day) });
    }
  }
  await SearchLog.insertMany(searches);
  console.log(`Sample searches: ${searches.length}`);

  const saved = ['morning-on-the-river', 'peonies-in-a-blue-jar', 'koi-pond', 'heron-in-the-reeds', 'woman-reading-by-the-window', 'madonna-of-the-olive-grove'];
  await Favourite.insertMany(saved.map((slug, i) => ({ user: ada._id, painting: paintingBySlug.get(slug)._id, createdAt: new Date(now - (i + 1) * day) })));
  console.log(`Ada's favourites: ${saved.length}`);

  await ContactMessage.insertMany([
    { name: 'Tolu Bankole', email: 'tolu@example.com', subject: 'A painting', message: 'Hello, is Harbour Haze by Henrik Vos painted on linen or canvas? The details page says linen and I wanted to be sure.', createdAt: new Date(now - 2 * day) },
    { name: 'Grace Mensah', email: 'grace@example.com', subject: 'My account', message: 'I did not get my six digit code the first time. Resending worked, but you may want to look at it.', status: 'read', createdAt: new Date(now - 4 * day) },
    { name: 'Daniel Okoro', email: 'daniel@example.com', subject: 'General question', message: 'I love the Identify a style page. Will you add more paintings to the gallery later this year?', status: 'replied', createdAt: new Date(now - 7 * day) },
  ]);
  console.log('Sample contact messages: 3');
}

main().catch(async (err) => {
  if (err?.name === 'MongooseServerSelectionError' || err?.name === 'MongoServerSelectionError') {
    console.error(`\nCould not reach MongoDB: ${err.message}\nCheck MONGODB_URI in server/.env and that your IP address is allowed in Atlas (Network Access).\n`);
  } else {
    console.error(err);
  }
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
