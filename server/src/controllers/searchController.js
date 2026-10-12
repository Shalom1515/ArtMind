import { search, suggest } from '../services/search/index.js';

export async function runSearch(req, res) {
  res.json(await search(req.query, { user: req.user, visitorId: req.guestId }));
}

export async function suggestPaintings(req, res) {
  res.json({ query: req.query.q, suggestions: await suggest(req.query) });
}
