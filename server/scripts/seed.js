import mongoose from 'mongoose';
import { config } from '../src/config/env.js';
import { missingSeedSettings, seedDatabase } from './seedData.js';

async function main() {
  const missing = missingSeedSettings();
  if (missing.length) {
    console.error(`\n${missing.join(', ')} ${missing.length === 1 ? 'is' : 'are'} empty in server/.env. Fill ${missing.length === 1 ? 'it' : 'them'} in and run npm run seed again.\n`);
    process.exit(1);
  }

  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 10000 });
  console.log(`Connected to ${mongoose.connection.name}`);

  const { counts, skipped } = await seedDatabase();

  console.log('\nSummary');
  for (const [label, count] of Object.entries(counts)) console.log(`  ${label.padEnd(14)} ${count}`);
  if (skipped.length) console.log(`\nSkipped images (${skipped.length}): ${skipped.join(', ')}`);
  else console.log('\nEvery painting image was found.');
  console.log('\nDone. You can log in with the demo accounts now.');
  await mongoose.disconnect();
  process.exit(0);
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
