import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { serverRoot } from './env.js';

// Every folder that receives uploads lives here, so tests can move them to a temporary folder.
const defaults = {
  paintings: path.join(serverRoot, 'data', 'images', 'paintings'),
  artists: path.join(serverRoot, 'data', 'images', 'artists'),
  uploads: path.join(serverRoot, 'uploads'),
};

export const storage = {
  paintings: defaults.paintings,
  artists: defaults.artists,
  uploads: defaults.uploads,
  get avatars() {
    return path.join(this.uploads, 'avatars');
  },
};

export function useStorageRoot(root) {
  storage.paintings = path.join(root, 'paintings');
  storage.artists = path.join(root, 'artists');
  storage.uploads = path.join(root, 'uploads');
  for (const folder of [storage.paintings, storage.artists, storage.avatars]) mkdirSync(folder, { recursive: true });
}

export function resetStorage() {
  Object.assign(storage, defaults);
}

export function ensureFolder(folder) {
  mkdirSync(folder, { recursive: true });
  return folder;
}

// Images saved by an admin win, then the images that ship with the project.
export function findImage(kind, slug) {
  const name = `${slug}.jpg`;
  const saved = path.join(storage[kind], name);
  if (existsSync(saved)) return saved;
  const shipped = path.join(defaults[kind], name);
  return existsSync(shipped) ? shipped : null;
}

export const defaultFolders = defaults;
