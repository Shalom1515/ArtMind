import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { resetStorage, useStorageRoot } from '../src/config/storage.js';

export const PASSWORDS = { admin: 'AdminPass123', user: 'DemoPass123' };

// Starts an in memory MongoDB, seeds it and moves every upload folder to a temporary folder.
export async function startTestDb({ seed = true, useModel = false } = {}) {
  process.env.SEED_ADMIN_PASSWORD = PASSWORDS.admin;
  process.env.SEED_USER_PASSWORD = PASSWORDS.user;
  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'artmind_test_'));
  useStorageRoot(tempRoot);
  let summary = null;
  if (seed) {
    const { seedDatabase } = await import('../scripts/seedData.js');
    summary = await seedDatabase({ log: () => {}, useModel });
  }
  return {
    summary,
    tempRoot,
    async stop() {
      await mongoose.disconnect();
      await mongo.stop();
      resetStorage();
      rmSync(tempRoot, { recursive: true, force: true });
    },
  };
}

export async function loginAs(app, who = 'user') {
  const agent = request.agent(app);
  const email = who === 'admin' ? 'admin@artmind.test' : 'ada@artmind.test';
  await agent.post('/api/auth/login').send({ email, password: PASSWORDS[who] }).expect(200);
  return agent;
}
