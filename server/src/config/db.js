import mongoose from 'mongoose';
import { config } from './env.js';

mongoose.set('strictQuery', true);

export function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

export async function connectDb() {
  if (!config.mongoUri) {
    console.warn('[db] MONGODB_URI is missing in server/.env. The server will run, but every API route that needs data will fail until you add it.');
    return false;
  }
  try {
    await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 8000 });
    console.log(`[db] Connected to MongoDB (${mongoose.connection.name})`);
    return true;
  } catch (err) {
    console.warn(`[db] Could not connect to MongoDB: ${err.message}`);
    console.warn('[db] Check MONGODB_URI and that your IP address is allowed in Atlas. The server keeps running without data.');
    return false;
  }
}

export async function disconnectDb() {
  await mongoose.disconnect();
}
