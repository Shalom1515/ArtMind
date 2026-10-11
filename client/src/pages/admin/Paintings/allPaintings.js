import { listPaintings } from '../../../api/admin.js';

export async function loadAllPaintings({ q, category } = {}) {
  const first = await listPaintings({ q, category, page: 1, limit: 60 });
  const rest = [];
  for (let page = 2; page <= (first.pages || 1); page += 1) rest.push(listPaintings({ q, category, page, limit: 60 }));
  const more = await Promise.all(rest);
  return [first, ...more].flatMap((result) => result.items);
}
