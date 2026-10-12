# Installing ArtMind

These steps take a fresh computer to a running copy of ArtMind. They were written for Windows but work the same way on macOS and Linux.

## What you need

* **Node.js 20** (version 20.19 or newer) with npm. Newer versions also work. To check, run `npm version` and look at the node line.
* **A MongoDB Atlas database.** The free M0 cluster is enough. You can create one at cloud.mongodb.com.
* **The project folder**, either from the repository or from the zip we hand in.
* **An internet connection the first time the server starts**, so it can download the image recognition model (see step 6).

## 1. Install the packages

Open a terminal in the project folder (the one with `README.md` in it) and run:

```bash
npm install
```

This installs the packages for both the client and the server in one go.

## 2. Set up the database

1. In MongoDB Atlas, create a cluster (M0 is fine).
2. Under **Database Access**, add a database user with a password.
3. Under **Network Access**, add your current IP address. Atlas refuses every connection from an address that is not on this list, so do this again whenever you work from a new network. For a quick demo you can allow `0.0.0.0/0`, but remove it afterwards.
4. Press **Connect**, choose **Drivers** and copy the connection string. It looks like `mongodb+srv://USER:PASSWORD@cluster0.abcde.mongodb.net/`. Put the database name `artmind` after the last slash.

## 3. Fill in the .env files

Copy each example file to `.env` in the same folder and fill it in.

```bash
copy server\.env.example server\.env
copy client\.env.example client\.env
```

(On macOS or Linux use `cp` and forward slashes.)

**`server/.env`**

* `PORT`: `5000`
* `MONGODB_URI`: The Atlas connection string from step 2, ending in `/artmind`
* `JWT_SECRET`: A long random string of letters and numbers, at least 32 characters. It signs the login cookie, so keep it secret.
* `CLIENT_URL`: `http://localhost:5173`. You can list several addresses separated by commas, for example `http://localhost:5173,http://localhost:4173`. The first one is used in the password reset link.
* `SEED_ADMIN_PASSWORD`: The password for the demo admin account.
* `SEED_USER_PASSWORD`: The password for Ada and the other sample users.
* `RESEND_API_KEY`: Your API key from resend.com (API Keys page). Every email goes through Resend. Leave it empty while testing and the emails are printed in the server terminal instead.
* `MAIL_FROM`: The sender, for example `ArtMind <hello@yourdomain.com>`. The domain must be verified in Resend. For a quick test you can use `ArtMind <onboarding@resend.dev>`, but then Resend only delivers to the email address of the person who owns the Resend account.
* `ASSISTANT_API_URL`: Optional. The base address of the language model service, the part before `/chat/completions`.
* `ASSISTANT_API_KEY`: Optional. The key for that service.
* `ASSISTANT_MODEL`: Optional. The name of a model your key can use.

When the three `ASSISTANT` names are empty, everything still works: search, the assistant, the taste sentence and the generated painting text all use our own rules. When they are set, the server asks the model to improve those answers and falls back to the rules whenever the model is slow, busy or gives an answer it cannot read.

**`client/.env`**

* `VITE_API_URL`: Leave it empty. In development, Vite forwards `/api` and `/uploads` to the server on port 5000.
* `VITE_USE_MOCK`: `false` to use the real server and database. `true` runs the pages on sample data in the browser. Logging in, registering, the email code and password resets always use the real server.

## 4. Where the images go

The images that ship with the project are already `.jpg` files in the right places:

* **60 paintings, named after the painting, for example `morning-on-the-river.jpg`**: `server/data/images/paintings`
* **12 artist portraits, for example `adaeze-nwosu.jpg`**: `server/data/images/artists`
* **Category tiles, page photos and team photos**: `client/public/images`
* **5 test images for Identify a style**: `docs/test_images`
* **4 logo files (these stay `.png`)**: `client/public/brand`
* **Avatars uploaded by users**: `server/uploads/avatars` (made by the server)

Paintings and portraits added later by an admin are saved in the same two folders, with names made from the title or the artist's name in the same pattern.

You only need `npm run images` when you start from the original `.png` files. Put them in the folders above and run:

```bash
npm run images
```

It makes a smaller `.jpg` copy of every image (1600 pixels on the longest side), copies the category tiles and the pictures for the log in pages, and lists anything still missing. Wherever an image is missing, the site shows a soft colour placeholder instead.

## 5. Fill the database

```bash
npm run seed
```

This stops with a clear message if `MONGODB_URI`, `SEED_ADMIN_PASSWORD` or `SEED_USER_PASSWORD` is empty. Otherwise it empties the database and loads the 12 artists, 60 paintings, 6 collections, the FAQ, the demo accounts, 20 sample users and a month of sample views, searches, favourites, conversations and contact messages, so the dashboard and the admin pages look real. For every painting it also reads the image to work out its palette, its main colour and its recognition features. At the end it prints how many records it made and any image it had to skip. Only run it on a database you are happy to empty.

## 6. Start the site

```bash
npm run dev
```

This starts both parts together:

* the website on http://localhost:5173 (open this one in the browser)
* the API on http://localhost:5000 (you can check it at http://localhost:5000/api/health, which says whether the database and the image model are ready)

The first time the server starts, it downloads the MobileNet image model (about 14 MB) and keeps a copy in `server/data/models/mobilenet`. Later starts load that copy, so the server works offline. The folder is not stored in git. While the model loads, Identify a style still answers using simple rules.

Stop both parts with Ctrl and C in the terminal.

## Demo logins

* **Admin**: `admin@artmind.test`, password the `SEED_ADMIN_PASSWORD` you chose
* **User (Ada Okafor)**: `ada@artmind.test`, password the `SEED_USER_PASSWORD` you chose

The demo accounts are already verified. New accounts get a six digit code by email. It lasts 10 minutes, allows 5 tries, and a new one can be asked for after a minute.

## Running the tests

```bash
npm test
```

This runs the server tests and then the client tests. The server tests use an in memory MongoDB, so they never touch your Atlas data. The first run downloads that test database (about 780 MB), which can take a few minutes; later runs start in seconds. The language model and the email service are always replaced by stand ins, so no test sends real requests. Tests that upload images write to a temporary folder that is deleted afterwards.

The recognition test uploads the 5 test images, prints what it predicts for each one, and passes when at least 4 of the 5 categories are right. It needs the image model, so on a computer that has never been online it is skipped with a message saying why.

## Running it as one site

```bash
npm run build
```

Then set `NODE_ENV=production` in the environment and `CLIENT_URL=http://localhost:5000` in `server/.env`, and run:

```bash
npm start
```

The whole site is then served from http://localhost:5000.

## How the smart parts work

This part explains in plain words how ArtMind recognises styles, understands searches and picks recommendations.

### Style recognition (Identify a style)

When someone uploads a photo, the server never saves it. It reads the image in memory with sharp, a fast image library, and does two things.

1. **Colour and texture.** It shrinks the picture and groups its pixels into six main colours, which become the palette. It also measures how bright the picture is, how strong the colours are, how much contrast and fine detail it has, and how much of it is flat colour. These measurements give the three short notes, such as "Soft edges and smooth blending".
2. **Deep features.** It resizes the picture to 224 by 224 pixels and passes it through MobileNet, a small neural network trained on millions of photos, using TensorFlow.js. Instead of asking MobileNet what the photo shows, we take its internal description of the picture: a list of 1280 numbers called an embedding. Pictures that look alike have embeddings that point the same way, which we measure with cosine similarity.

Every gallery painting has its embedding worked out once, when the database is seeded or an admin saves a new image. For an upload, the server finds the 7 gallery paintings with the closest embeddings and lets them vote on the style, category, mood and medium, with closer paintings counting more. This is called k nearest neighbours. Two smaller votes help: the 5 paintings with the closest texture measurements, and a few of MobileNet's own labels that point to a subject (a vase suggests flowers, a heron suggests nature). The share of the vote gives the confidence: "likely" when one answer wins at least half the vote, otherwise "possible". The closest paintings are shown as similar paintings.

We chose these weights by testing them on our own 60 paintings, hiding one painting at a time and predicting its category from the other 59. The combined vote got 42 of the 60 right, against 39 for the deep features alone. On the five test images it gets 4 of the 5 categories right.

### Smart search

A search sentence is turned into filters by matching its words against a vocabulary built from our own data: the categories, styles, mediums, surfaces, moods, artists and years in the database, the twelve colour groups, and a list of everyday words. For example "watercolor" becomes Watercolour, "peaceful" and "quiet" become Calm, "warm colours" means red, orange or ochre, "birds" means Nature and "modern" means contemporary or abstract. Longer phrases are matched first, so "abstract expressionism" is not read as just "abstract". Words that are left over and appear in painting tags become keyword chips.

Each understood word becomes a chip the visitor can remove. A painting must match every kind of chip that is left (for example both the category and the mood). Results are ranked by how many filters they match, then by matching tags, then by MongoDB's text index on the title, description and tags. When the language model is set up, it reads the sentence too, and we keep only the values it suggests that really exist in our data. Every new search is saved with its result count for the admin charts.

### Recommendations

Recommendations are content based: they look at the paintings themselves, not at what other people liked. For each visitor the server builds a picture of their taste from the paintings they viewed (each counts once), the paintings they saved (each counts three times) and the categories they chose as interests (each counts twice). Every painting they have not seen yet gets a score from how well its category, style, medium, mood, artist and palette fit that taste, plus how close its MobileNet embedding is to the paintings they liked, with a small bonus for popular paintings. The best scores are shown, mixed so that the same reason does not repeat too often.

Each recommendation explains itself in one line: "Because you saved Morning on the River" when it is very close to a saved painting, "Matches your interest in Landscape" when it is in a chosen category, or "Because you viewed Nature recently". Visitors who have not logged in, and new users with no history, see the paintings most viewed this week and the featured paintings. "Similar paintings" on a painting page blend the embedding similarity with shared category, style, mood, medium, tags and colours.

## If something goes wrong

* **"MONGODB_URI is missing"** in the server terminal: `server/.env` does not exist or the line is empty. The site still opens, but pages that need data answer with a database message.
* **"Could not reach MongoDB"**: check the connection string and password, and that your IP address is in Network Access in Atlas.
* **The code email never arrives**: check the Logs page in Resend. With `onboarding@resend.dev` as the sender, Resend only delivers to the email of the Resend account owner; verify a domain to send to anyone. With `RESEND_API_KEY` empty, look for the email in the server terminal.
* **The assistant only gives short rule based answers**: the three `ASSISTANT` names are empty or the model name is not one your key can use. The server terminal says why each time it falls back.
* **"MobileNet could not load"**: the first start had no internet connection. Start the server again once you are online.
* **Port 5173 or 5000 is already in use**: close the other program, or change `PORT` in `server/.env` and the address at the top of `client/vite.config.js`.
