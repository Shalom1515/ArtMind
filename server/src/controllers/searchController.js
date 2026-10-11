import { search } from '../services/search/index.js';

export async function runSearch(req, res) {
  res.json(await search(req.query, { user: req.user, visitorId: req.guestId }));
}
