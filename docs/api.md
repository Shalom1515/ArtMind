# ArtMind API

This is the contract between the client and the server. The mock adapter in `client/src/api/mock` follows it too, so the pages work the same way with or without the real server. The auth endpoints are the exception: they always go to the real server, even in mock mode. If you need to change an endpoint, change this file first and tell the team.

## The basics

Every path starts with `/api`. Auth emails (the six digit code and the reset link) are sent through Resend, using `RESEND_API_KEY` and `MAIL_FROM` in `server/.env`. Requests and responses are JSON unless an endpoint says it takes a file upload (`multipart/form-data`) or sends back a file.

Who can call an endpoint:

| Label | Meaning |
|---|---|
| Public | Anyone, logged in or not |
| User | Any logged in user (admins too) |
| Admin | Logged in users with the admin role |

### Logging in and cookies

When you log in or verify your email the server sets an `httpOnly` cookie called `artmind_token`. The browser sends it back by itself, so the client never touches the token. The fetch wrapper in `client/src/api/client.js` always sends `credentials: "include"`.

With "Remember me" the cookie lasts 30 days. Without it the cookie ends when the browser closes. Each login creates a Session record, which is how "Sign out of other devices" works.

### Errors

Every error has the same shape and a matching HTTP status.

```json
{
  "error": {
    "message": "Please check the highlighted fields.",
    "code": "VALIDATION",
    "fields": { "email": "Enter a valid email address." }
  }
}
```

| Status | Code | When |
|---|---|---|
| 400 | `VALIDATION` | The body or query is wrong. `fields` says which ones. |
| 401 | `UNAUTHENTICATED` | You need to log in. |
| 403 | `FORBIDDEN` | Logged in but not allowed, for example not an admin. |
| 403 | `NOT_VERIFIED` | Login with an email that is not verified yet. |
| 404 | `NOT_FOUND` | No such painting, artist, route and so on. |
| 409 | `CONFLICT` | Email already registered, artist still has paintings. |
| 413 | `TOO_LARGE` | Upload over the size limit. |
| 429 | `RATE_LIMITED` | Too many requests. Try again later. |
| 500 | `SERVER_ERROR` | Something broke on our side. |
| 501 | `NOT_BUILT` | The endpoint exists but is not built yet. |
| 502 | `MAIL_FAILED` | Resend did not accept the email. Try again. |
| 503 | `MAIL_NOT_SET_UP` | `RESEND_API_KEY` or `MAIL_FROM` is missing. |
| 503 | `DB_UNAVAILABLE` | The database is not connected. |

### Lists and pages

Lists that can be long take `page` (starts at 1) and `limit`. They answer like this:

```json
{ "items": [], "page": 1, "limit": 12, "total": 60, "pages": 5 }
```

### Shapes we use everywhere

**PaintingCard** is the short form used in grids, carousels and chat replies.

```json
{
  "id": "6710c0ffee0000000000p011",
  "slug": "morning-on-the-river",
  "title": "Morning on the River",
  "artist": { "slug": "adaeze-nwosu", "name": "Adaeze Nwosu" },
  "year": 2016,
  "category": "Landscape",
  "style": "Impressionism",
  "orientation": "landscape",
  "image": "/images/paintings/morning-on-the-river.jpg",
  "tones": ["#5C7A6B", "#A7B8A0", "#D9C9A3"],
  "featured": false
}
```

`tones` are two or three colours picked from the painting. The client uses them for the soft gradient placeholder when an image is missing or still loading.

**Painting** is the full form. It has everything in PaintingCard plus:

```json
{
  "code": "P11",
  "medium": "Oil",
  "surface": "Canvas",
  "widthCm": 90,
  "heightCm": 60,
  "colours": "soft greens, silver and pale gold",
  "colourGroups": ["green", "grey", "yellow"],
  "mood": "Calm",
  "description": "Two sentences about the painting.",
  "summary": "One or two sentences used in the Summary band.",
  "tags": ["river", "dawn", "mist"],
  "palette": ["#5C7A6B", "#A7B8A0", "#D9C9A3", "#7E6A4F", "#3E4A52", "#C8B59A"],
  "heroOfDay": true,
  "artist": {
    "slug": "adaeze-nwosu",
    "name": "Adaeze Nwosu",
    "country": "Nigeria",
    "bornYear": 1978,
    "portrait": "/images/artists/adaeze-nwosu.jpg"
  },
  "collections": [{ "slug": "quiet_landscapes", "title": "Quiet landscapes" }],
  "views": 248,
  "saves": 36,
  "saved": false
}
```

`saved` is only true when a logged in user has it in their favourites. `palette` can be empty until the images script has run; fall back to `tones`.

**ArtistCard**

```json
{
  "id": "6710c0ffee00000000000a07",
  "slug": "samuel-adeyemi",
  "name": "Samuel Adeyemi",
  "country": "Nigeria",
  "bornYear": 1984,
  "styles": ["Realism", "Figurative"],
  "portrait": "/images/artists/samuel-adeyemi.jpg",
  "works": 5
}
```

`works` is always counted from the paintings, never stored.

**User**

```json
{
  "id": "6710c0ffee00000000000u02",
  "name": "Ada Okafor",
  "email": "ada@artmind.test",
  "role": "user",
  "verified": true,
  "country": "Nigeria",
  "bio": "Art lover, curious mind...",
  "avatar": null,
  "interests": ["Landscape", "Flower", "Nature"],
  "joinedAt": "2026-09-14T10:30:00.000Z"
}
```

`role` is `user` or `admin`. `avatar` is a URL under `/uploads/avatars` or `null`, in which case the client shows initials.

### Fixed lists

There are exactly six categories: Abstract, Landscape, Flower, Nature, Figurative, Religious.

The twelve colour groups used by the Dominant colour filter are `red`, `orange`, `yellow`, `green`, `teal`, `blue`, `violet`, `pink`, `cream`, `grey`, `brown` and `black`.

## Health and options

### `GET /api/health`
Public. Tells you the server is up and whether the database is connected.

```json
{ "status": "ok", "database": "connected" }
```

`database` is `connected` or `disconnected`.

### `GET /api/options`
Public. The lists used by filters and form selects.

```json
{
  "categories": ["Abstract", "Landscape", "Flower", "Nature", "Figurative", "Religious"],
  "styles": ["Abstract expressionism", "Baroque revival", "Colour field", "..."],
  "mediums": ["Acrylic", "Charcoal", "Gouache", "Ink", "Mixed media", "Oil", "Pastel", "Tempera", "Watercolour"],
  "surfaces": ["Board", "Canvas", "Linen", "Paper", "Wood panel"],
  "moods": ["Calm", "Dramatic", "Energetic", "Joyful", "Melancholic", "Solemn", "Tender"],
  "colours": [{ "key": "red", "label": "Red", "hex": "#A33A2C" }]
}
```

### `GET /api/faq`
Public. The questions on the Contact page.

```json
{ "items": [{ "question": "What is ArtMind?", "answer": "..." }] }
```

## Auth

### `POST /api/auth/register`
Public. Creates an account that is not verified yet and emails a six digit code through Resend. The code is made on the server and only its hash is stored. It does not log the user in. Registering again with an email that is not verified yet updates the details and sends a new code.

Request:
```json
{
  "name": "Ada Okafor",
  "email": "ada@artmind.test",
  "password": "Demo1234",
  "interests": ["Landscape", "Flower", "Nature"],
  "agree": true
}
```

Rules: name 2 to 60 characters, a valid email, password at least 8 characters with at least one letter and one number, exactly three interests from the six categories, `agree` must be true.

Response `201`:
```json
{ "email": "ada@artmind.test", "message": "We sent a six digit code to ada@artmind.test." }
```

`409 CONFLICT` if the email is taken.

### `POST /api/auth/verify`
Public. Checks the code. On success it marks the user verified, sets the cookie and logs them in.

Request: `{ "email": "ada@artmind.test", "code": "482915" }`

Response: `{ "user": User }`

Codes expire after 15 minutes. Five wrong tries and the code is cancelled, so the user has to ask for a new one.

### `POST /api/auth/resend`
Public. Sends a new code. Only one per minute.

Request: `{ "email": "ada@artmind.test" }`

Response: `{ "message": "A new code is on its way.", "retryAfter": 60 }`

### `POST /api/auth/login`
Public.

Request: `{ "email": "ada@artmind.test", "password": "Demo1234", "remember": true }`

Response: `{ "user": User }` and the cookie is set.

Wrong email or password gives `401` with the message "Email or password is not right." (we never say which one). An unverified account gives `403 NOT_VERIFIED` and the client sends the user to `/verify`. A deactivated account gives `403 FORBIDDEN`.

### `POST /api/auth/logout`
Public. Ends the current session and clears the cookie.

Response: `{ "message": "Logged out." }`

### `POST /api/auth/forgot`
Public. Emails a reset link to `CLIENT_URL/reset/<token>` if the email exists. The answer is the same either way so nobody can test which emails are registered.

Request: `{ "email": "ada@artmind.test" }`

Response: `{ "message": "If that email is registered, a reset link is on its way." }`

### `POST /api/auth/reset`
Public. The link expires one hour after it was sent and works once. A reset also signs the user out everywhere.

Request: `{ "token": "from the link", "password": "NewPass123" }`

Response: `{ "message": "Your password has been changed. You can log in now." }`

### `GET /api/auth/me`
Public. Who is logged in. Answers `200` even when nobody is, so the client can call it on every page load without errors.

Response: `{ "user": User }` or `{ "user": null }`

## Home and categories

### `GET /api/home`
Public. Everything the home page needs in one call.

```json
{
  "hero": Painting,
  "categories": [{ "name": "Abstract", "count": 10, "image": "/images/categories/abstract.jpg" }],
  "featured": [PaintingCard],
  "trending": [PaintingCard],
  "featuredArtist": { "artist": ArtistCard, "bio": "First paragraph of the bio.", "paintings": [PaintingCard] },
  "collections": [CollectionCard],
  "searchSuggestions": ["calm landscapes", "abstract with warm colours", "religious paintings on wood panel"]
}
```

`hero` is the painting with `heroOfDay` set. `featured` has the eight featured paintings. `trending` has six. `collections` has the first three by order.

### `GET /api/categories`
Public. The six categories with their counts and tile images.

```json
{ "items": [{ "name": "Abstract", "count": 10, "image": "/images/categories/abstract.jpg" }] }
```

## Paintings

### `GET /api/paintings`
Public. The gallery list with filters, sort, pages and filter counts.

| Query | Example | Notes |
|---|---|---|
| `category` | `Landscape,Nature` | Comma separated, any of them |
| `style` | `Impressionism` | Comma separated |
| `medium` | `Oil,Acrylic` | Comma separated |
| `surface` | `Canvas` | Comma separated |
| `colour` | `red,blue` | Colour group keys |
| `mood` | `Calm` | Comma separated |
| `artist` | `adaeze-nwosu` | One artist slug |
| `yearFrom`, `yearTo` | `2015`, `2020` | Inclusive |
| `featured` | `true` | Only featured |
| `q` | `river` | Simple text match on title, artist and tags |
| `sort` | `newest` | `newest` (default), `oldest`, `title`, `popular` |
| `page`, `limit` | `1`, `12` | Default limit 12, at most 60 |

Response:
```json
{
  "items": [PaintingCard],
  "page": 1, "limit": 12, "total": 26, "pages": 3,
  "counts": {
    "category": { "Abstract": 4, "Landscape": 6 },
    "style": { "Impressionism": 7 },
    "medium": { "Oil": 12 },
    "surface": { "Canvas": 15 },
    "colour": { "red": 3 },
    "mood": { "Calm": 9 }
  }
}
```

Each group in `counts` is worked out with every other filter applied but not its own, so ticking a box never hides the other choices in the same group.

### `GET /api/paintings/trending`
Public. Most viewed in the last 7 days. Falls back to featured paintings when there are no views yet.

Query: `limit` (default 6). Response: `{ "items": [PaintingCard] }`

### `GET /api/paintings/:slug`
Public. One painting in full. Response: `{ "painting": Painting }`. `404` if the slug is unknown.

### `GET /api/paintings/:slug/similar`
Public. Paintings that share category, style, mood, tags or colours, best match first. The painting itself is never included.

Query: `limit` (default 4). Response: `{ "items": [PaintingCard] }`

### `GET /api/paintings/:slug/moreByArtist`
Public. Other paintings by the same artist, newest first.

Query: `limit` (default 4). Response: `{ "items": [PaintingCard] }`

### `POST /api/paintings/:slug/view`
Public. Records a view for analytics, recently viewed and recommendations. Call it once when the details page opens. Repeat views from the same person within 30 minutes are ignored.

Response: `204` with no body.

### `GET /api/paintings/:slug/download`
Public. Sends the painting details as a file with the logo, image, facts, description, summary, tags and palette.

Query: `format` is `pdf` or `docx`.

Response: the file, with `Content-Disposition: attachment; filename="morning-on-the-river.pdf"`.

## Artists

### `GET /api/artists`
Public. All artists by name.

Query: `q` (part of a name), `letter` (first letter of the surname, or `all`).

Response: `{ "items": [ArtistCard], "total": 12 }`

### `GET /api/artists/:slug`
Public. One artist with their paintings and up to four similar artists (sharing a category or style).

```json
{
  "artist": { "...ArtistCard": "", "bio": "Two paragraphs separated by a blank line." },
  "paintings": [PaintingCard],
  "similar": [ArtistCard]
}
```

## Collections

**CollectionCard**

```json
{
  "id": "6710c0ffee00000000000c01",
  "slug": "quiet_landscapes",
  "title": "Quiet landscapes",
  "shortLine": "Mist, still water and soft light.",
  "count": 8,
  "covers": [PaintingCard]
}
```

`covers` holds the first four paintings, for the mosaic.

### `GET /api/collections`
Public. Response: `{ "items": [CollectionCard] }` in order.

### `GET /api/collections/:slug`
Public.

```json
{
  "collection": { "...CollectionCard": "", "description": "The longer text for the top of the page." },
  "paintings": [PaintingCard]
}
```

## Search

### `GET /api/search`
Public. Takes a sentence, works out what it means and returns matching paintings. Each search is saved to the search log for the admin charts.

| Query | Example | Notes |
|---|---|---|
| `q` | `calm landscapes with soft light` | Required, up to 200 characters |
| `exclude` | `mood:Calm` | Chips the user removed, comma separated `type:value` |
| `sort` | `best` | `best` (default), `newest`, `oldest` |
| `page`, `limit` | `1`, `12` | |

Response:
```json
{
  "query": "calm landscapes",
  "understood": [
    { "key": "category:Landscape", "type": "category", "value": "Landscape", "label": "Category: Landscape" },
    { "key": "mood:Calm", "type": "mood", "value": "Calm", "label": "Mood: Calm" }
  ],
  "items": [PaintingCard],
  "page": 1, "limit": 12, "total": 8, "pages": 1
}
```

Chip types are `category`, `style`, `medium`, `surface`, `colour`, `mood`, `artist` and `keyword`. Removing a chip means calling again with its `key` added to `exclude`.

## Identify a style

### `POST /api/identify`
Public. Takes a photo of a painting and suggests its likely style, category, mood, medium and palette, with similar paintings from the gallery. The file is read in memory and thrown away. It is never saved.

Request: `multipart/form-data` with one field `image`. JPG, PNG or WEBP, up to 5 MB.

Response:
```json
{
  "fileName": "haystack.jpg",
  "findings": {
    "style": { "value": "Impressionism", "confidence": "likely" },
    "category": { "value": "Landscape", "confidence": "likely" },
    "mood": { "value": "Calm", "confidence": "possible" },
    "medium": { "value": "Oil", "confidence": "possible" },
    "palette": ["#5C7A6B", "#A7B8A0", "#D9C9A3", "#7E6A4F", "#3E4A52", "#C8B59A"],
    "notes": ["Short broken brush strokes", "Warm light against cool shadow", "Low horizon with a wide sky"]
  },
  "similar": [PaintingCard],
  "searchQuery": "calm impressionism landscape"
}
```

`confidence` is `likely` or `possible`. "Search the gallery with these" sends the user to `/search?q=` with `searchQuery`.

## Recommendations and dashboard

### `GET /api/recommendations`
User. Paintings picked from the user's views, favourites and interests, each with a short reason.

Query: `limit` (default 8).

```json
{
  "items": [
    { "painting": PaintingCard, "reason": "Because you saved Morning on the River" }
  ]
}
```

### `GET /api/me/insights`
User. Everything for the dashboard.

```json
{
  "stats": { "viewed": 38, "favourites": 6, "categoriesExplored": 4, "conversations": 3 },
  "recommended": [{ "painting": PaintingCard, "reason": "Matches your interest in Landscape" }],
  "recentlyViewed": [PaintingCard],
  "favouriteCategories": [{ "name": "Landscape", "count": 14 }],
  "taste": "You keep coming back to calm water and soft morning light...",
  "collectionsForYou": [
    { "title": "Still water and soft light", "reason": "Because you viewed many landscape paintings", "paintings": [PaintingCard] }
  ]
}
```

`favouriteCategories` counts views plus saves per category, highest first. `collectionsForYou` are built for the user and are not the six fixed collections.

### `POST /api/me/insights/taste`
User. Writes a fresh taste summary (the Refresh link). Response: `{ "taste": "..." }`

## Favourites

### `GET /api/favourites`
User.

Query: `sort` is `recent` (default), `title` or `artist`.

```json
{ "items": [{ "painting": PaintingCard, "savedAt": "2026-10-09T18:20:00.000Z" }], "total": 6 }
```

### `GET /api/favourites/ids`
User. Just the saved slugs, so every heart on the site can show the right state.

Response: `{ "slugs": ["morning-on-the-river", "koi-pond"] }`

### `POST /api/favourites`
User. Request: `{ "slug": "koi-pond" }`. Response `201`: `{ "slug": "koi-pond", "savedAt": "...", "count": 7 }`. Saving twice is fine and returns the same thing.

### `DELETE /api/favourites/:slug`
User. Response: `{ "slug": "koi-pond", "count": 6 }`

### `GET /api/favourites/export`
User. A PDF of the user's favourites with thumbnails and details. Response: the file, `artmind_favourites.pdf`.

## Assistant

The assistant answers questions about paintings, artists, styles and techniques. It always knows the ArtMind collection and can suggest paintings from it. When `ASSISTANT_API_URL` and `ASSISTANT_API_KEY` are set the server passes the question to that service with the collection as context. When they are not set, it answers from our own data with simple rules, so it always works in a demo.

**Message**

```json
{
  "id": "m3",
  "role": "assistant",
  "text": "Here are some calm landscapes with soft light.",
  "paintings": [PaintingCard],
  "followUps": ["More like these", "Only watercolours", "Explain the style"],
  "createdAt": "2026-10-10T09:12:00.000Z"
}
```

`role` is `user` or `assistant`. `paintings` and `followUps` can be empty.

### `GET /api/assistant/suggestions`
Public. Starter questions for the Suggested list.

Response: `{ "items": ["Explain impressionism in simple words", "Show me calm paintings for a bedroom"] }`

### `POST /api/assistant/messages`
Public. Sends one message and gets the reply. Logged in users have their conversations saved. Guests get `conversationId: null` and the client keeps the chat in memory. Limited to 20 messages a minute.

Request:
```json
{
  "conversationId": null,
  "message": "Which of these are watercolours?",
  "context": { "paintingSlug": "morning-on-the-river", "query": "calm landscapes" },
  "history": [{ "role": "user", "text": "..." }, { "role": "assistant", "text": "..." }]
}
```

`context` is optional. The chat panel fills it when it is opened from a painting page or a search. `history` is only read for guests, up to the last 10 messages.

Response: `{ "conversationId": "6710...", "reply": Message }`

### `GET /api/assistant/conversations`
User. Recent conversations, newest first.

Response: `{ "items": [{ "id": "6710...", "title": "Calm landscapes with soft light", "updatedAt": "..." }] }`

### `GET /api/assistant/conversations/:id`
User, own conversations only.

Response: `{ "conversation": { "id": "6710...", "title": "...", "messages": [Message] } }`

### `DELETE /api/assistant/conversations/:id`
User, own conversations only. Response: `204`.

## Profile

### `PATCH /api/me`
User. Updates the details tab. Send only what changed.

Request: `{ "name": "Ada Okafor", "bio": "...", "country": "Nigeria" }` (bio up to 300 characters)

Response: `{ "user": User }`

### `POST /api/me/photo`
User. `multipart/form-data` with a field `photo`. JPG, PNG or WEBP, up to 2 MB. The server crops it square to 400 px.

Response: `{ "user": User }`

### `PUT /api/me/interests`
User. Request: `{ "interests": ["Landscape", "Flower", "Nature"] }` (one to six categories). Response: `{ "user": User }`

### `PUT /api/me/password`
User. Request: `{ "currentPassword": "...", "newPassword": "..." }`. The new password follows the register rules. Other sessions are signed out, this one stays.

Response: `{ "message": "Password changed." }`

### `DELETE /api/me/sessions`
User. Signs out every other device. Response: `{ "signedOut": 2 }`

### `GET /api/me/export`
User. Downloads everything we hold about the user as a JSON file: profile, interests, favourites, views, searches, conversations and messages. File name `artmind_my_data.json`.

### `DELETE /api/me`
User. Deletes the account and everything linked to it. Admins cannot delete themselves if they are the last admin.

Request: `{ "password": "..." }`. Response: `204` and the cookie is cleared.

## Contact

### `POST /api/contact`
Public. Limited to 5 messages an hour per address.

Request:
```json
{ "name": "Ada", "email": "ada@artmind.test", "subject": "A painting", "message": "Hello..." }
```

`subject` is one of: General question, A painting, An artist, My account, Something is not working, Other. `message` is 10 to 2000 characters.

Response `201`: `{ "message": "Thank you. We will reply within two working days." }`

## Admin

Everything in this part needs the admin role.

### `GET /api/admin/overview`
Query: `days` is `7`, `30` (default) or `90`.

```json
{
  "totals": { "paintings": 60, "artists": 12, "users": 48, "views": 2140, "searches": 386 },
  "viewsPerDay": [{ "date": "2026-09-11", "count": 64 }],
  "searchesPerDay": [{ "date": "2026-09-11", "count": 22 }],
  "topPaintings": [{ "slug": "morning-on-the-river", "title": "Morning on the River", "views": 248 }],
  "viewsByCategory": [{ "category": "Landscape", "count": 690, "percent": 32 }],
  "topQueries": [{ "query": "calm landscapes", "count": 124 }],
  "recentActivity": [
    {
      "type": "view",
      "text": "Ada viewed Morning on the River",
      "painting": { "slug": "morning-on-the-river", "title": "Morning on the River", "image": "...", "tones": [] },
      "at": "2026-10-10T09:10:00.000Z"
    }
  ]
}
```

`totals.paintings`, `artists` and `users` are all time. `views` and `searches` are for the chosen days. `viewsPerDay` and `searchesPerDay` have one entry per day, zero included. `topPaintings` has up to 10, `topQueries` up to 8, `recentActivity` up to 10. Activity `type` is `view`, `favourite`, `search` or `register`.

### Paintings

**AdminPaintingRow**: `{ "id", "slug", "title", "artist": { "slug", "name" }, "category", "style", "image", "tones", "views", "saves", "featured" }`

| Method and path | What it does |
|---|---|
| `GET /api/admin/paintings` | List. Query `q`, `category`, `page`, `limit` (default 12). Answers a page of AdminPaintingRow. |
| `GET /api/admin/paintings/:id` | `{ "painting": Painting }` with `artistSlug` added, for the edit form. |
| `POST /api/admin/paintings` | Create. `multipart/form-data`, see below. Answers `201 { "painting": Painting }`. |
| `PUT /api/admin/paintings/:id` | Update. Same fields, `image` optional. Answers `{ "painting": Painting }`. |
| `DELETE /api/admin/paintings/:id` | Delete the painting, its image, its favourites and its place in collections. Answers `204`. |
| `PATCH /api/admin/paintings/:id/featured` | Body `{ "featured": true }`. Answers `{ "painting": PaintingCard }`. |
| `POST /api/admin/paintings/generate` | Fills style, mood, tags, summary and palette from an image. See below. |

Create and update fields: `title`, `artistSlug`, `year`, `category`, `style`, `medium`, `surface`, `widthCm`, `heightCm`, `mood`, `description`, `summary`, `featured` (`true` or `false`), `tags` and `palette` (both as JSON array strings), and `image` (JPG, PNG or WEBP, up to 8 MB, required on create). The slug is made from the title and must be unique. Orientation is worked out from the size.

Generate takes either `multipart/form-data` with `image`, or JSON `{ "id": "..." }` to use the image a painting already has. It answers:

```json
{
  "style": "Renaissance revival",
  "category": "Religious",
  "mood": "Solemn",
  "tags": ["gold leaf", "angel", "tempera"],
  "summary": "A short summary the admin can edit.",
  "palette": ["#C99A3A", "#A33A2C", "#1F2433", "#E2D8C4", "#9A5A3A", "#E6C68A"]
}
```

Nothing is saved until the form is saved.

### Artists

| Method and path | What it does |
|---|---|
| `GET /api/admin/artists` | Query `q`. `{ "items": [ArtistCard] }` with `bio` added. |
| `POST /api/admin/artists` | `multipart/form-data`: `name`, `country`, `bornYear`, `bio`, `styles` (JSON array string), `photo` (optional, up to 2 MB). Answers `201 { "artist": ArtistCard }`. |
| `PUT /api/admin/artists/:id` | Same fields, all optional. Answers `{ "artist": ArtistCard }`. |
| `DELETE /api/admin/artists/:id` | `204`, or `409 CONFLICT` while the artist still has paintings. |

### Collections

| Method and path | What it does |
|---|---|
| `GET /api/admin/collections` | `{ "items": [CollectionCard] }` with `description`, `order` and the full `paintings` slug list added. |
| `POST /api/admin/collections` | Body `{ "title", "shortLine", "description", "paintings": [slugs], "order" }`. Answers `201 { "collection": ... }`. |
| `PUT /api/admin/collections/:id` | Same body, all optional. |
| `DELETE /api/admin/collections/:id` | `204`. The paintings stay. |

### Users

**AdminUserRow**: `{ "id", "name", "email", "avatar", "verified", "role", "active", "joinedAt", "lastActiveAt" }`

| Method and path | What it does |
|---|---|
| `GET /api/admin/users` | Query `q` (name or email), `page`, `limit` (default 12). A page of AdminUserRow. |
| `PATCH /api/admin/users/:id/role` | Body `{ "role": "admin" }` or `{ "role": "user" }`. You cannot change your own role. Answers `{ "user": AdminUserRow }`. |
| `PATCH /api/admin/users/:id/active` | Body `{ "active": false }` to deactivate, `true` to bring back. A deactivated user is signed out and cannot log in. You cannot deactivate yourself. |

### Messages

**ContactMessage**: `{ "id", "name", "email", "subject", "message", "status", "createdAt" }` where `status` is `new`, `read` or `replied`.

| Method and path | What it does |
|---|---|
| `GET /api/admin/messages` | Query `status` (optional). `{ "items": [ContactMessage], "counts": { "new": 3, "read": 4, "replied": 1 } }`, newest first. |
| `PATCH /api/admin/messages/:id` | Body `{ "status": "read" }`. Answers `{ "message": ContactMessage }`. |

## Static files

| Path | Served from |
|---|---|
| `/images/paintings/<slug>.jpg` | `server/data/images/paintings` |
| `/images/artists/<slug>.jpg` | `server/data/images/artists` |
| `/uploads/...` | `server/uploads` (avatars and paintings added by admins) |
| `/images/...` anything else | `client/public/images` (site images, served by Vite or the client build) |

In development the Vite server forwards `/api`, `/images/paintings`, `/images/artists` and `/uploads` to the Express server on port 5000.
