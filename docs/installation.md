# Installing ArtMind

These steps take a fresh computer to a running copy of ArtMind. They were written for Windows but work the same way on macOS and Linux.

## What you need

- **Node.js 20** (version 20.19 or newer) with npm. Newer versions such as Node 22 also work. Check with `node -v`.
- **A MongoDB Atlas database.** The free M0 cluster is enough. You can create one at cloud.mongodb.com.
- **The project folder**, either from the repository or from the zip we hand in.
- **The generated images** (paintings, artist portraits and site photos). The site still works without them and shows a soft colour placeholder wherever an image is missing.

## 1. Install the packages

Open a terminal in the project folder (the one with `README.md` in it) and run:

```bash
npm install
```

This installs the packages for both the client and the server in one go.

## 2. Set up the database

1. In MongoDB Atlas, create a cluster (M0 is fine).
2. Under **Database Access**, add a database user with a password.
3. Under **Network Access**, add your current IP address. For a quick demo you can allow `0.0.0.0/0`, but remove it afterwards.
4. Press **Connect**, choose **Drivers** and copy the connection string. It looks like `mongodb+srv://USER:PASSWORD@cluster0.abcde.mongodb.net/`. Put the database name `artmind` after the last slash.

## 3. Fill in the two .env files

There are two example files. Copy each one to `.env` in the same folder and fill it in.

```bash
copy server\.env.example server\.env
copy client\.env.example client\.env
```

(On macOS or Linux use `cp` instead of `copy` and forward slashes.)

**`server/.env`**

| Setting | What to put |
|---|---|
| `PORT` | `5000` |
| `MONGODB_URI` | The Atlas connection string from step 2, ending in `/artmind` |
| `JWT_SECRET` | A long random string. You can make one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `CLIENT_URL` | `http://localhost:5173` |
| `SEED_ADMIN_PASSWORD` | The password for the demo admin account, for example `Demo1234` |
| `SEED_USER_PASSWORD` | The password for the demo user account, for example `Demo1234` |
| `RESEND_API_KEY` | Your API key from resend.com (API Keys page). The six digit codes and the reset links are sent through Resend. |
| `MAIL_FROM` | The sender, for example `ArtMind <hello@yourdomain.com>`. The domain must be verified in Resend. For a quick test you can use `ArtMind <onboarding@resend.dev>`, but Resend then only delivers to the email address of your own Resend account. |
| `ASSISTANT_API_URL`, `ASSISTANT_API_KEY`, `ASSISTANT_MODEL` | Optional. Leave them empty and the assistant answers from our own gallery data. |

**`client/.env`**

| Setting | What to put |
|---|---|
| `VITE_API_URL` | Leave it empty. In development, Vite forwards `/api` to the server on port 5000. |
| `VITE_USE_MOCK` | `false` to use the real server and database. `true` runs the pages on built in sample data in the browser. Logging in, registering, the email code and password resets always use the real server, so they need the database and Resend either way. |

## 4. Add the images

Put the generated `.png` files in these folders, with the exact names listed in our image list:

| Images | Folder |
|---|---|
| 60 paintings | `server/data/images/paintings` |
| 12 artist portraits | `server/data/images/artists` |
| Site photos and drawings | `client/public/images/about`, `home`, `room`, `states` and `team` |
| 5 test images for Identify a style | `docs/test_images` |
| 4 logo files | `client/public/brand` (these stay as `.png`) |

Then run:

```bash
npm run images
```

This makes a smaller `.jpg` copy of every painting, portrait, photo and test image (1600 pixels on the longest side), copies six paintings in as the category tiles and five as the pictures on the log in and register pages, and makes a trimmed logo for the header. At the end it lists anything still missing. You can run it again at any time; images that are already done are skipped.

## 5. Fill the database

```bash
npm run seed
```

This clears the database and loads the 12 artists, 60 paintings, 6 collections, the two demo accounts and a month of sample views, searches and favourites, so the dashboard and the admin charts have something to show. Only run it on a database you are happy to empty.

## 6. Start the site

```bash
npm run dev
```

This starts both parts together:

- the website on http://localhost:5173 (open this one in the browser)
- the API on http://localhost:5000 (you can check it at http://localhost:5000/api/health)

Stop both with Ctrl and C in the terminal.

## Demo logins

| Account | Email | Password |
|---|---|---|
| Admin | `admin@artmind.test` | the `SEED_ADMIN_PASSWORD` you chose |
| User (Ada Okafor) | `ada@artmind.test` | the `SEED_USER_PASSWORD` you chose |

The demo accounts are already verified, so they can log in without an email code. New accounts get their six digit code by email through Resend.

## Running the tests

```bash
npm test
```

This runs the server tests (the API foundations and the seed data) and then the client tests (the mock data layer and a check that every layout and component renders). Each part can also be run on its own with `npm test --workspace server` or `npm test --workspace client`.

## Running it as one site

To try the finished build the way it would run on a server:

```bash
npm run build
```

Then set `NODE_ENV=production` and `CLIENT_URL=http://localhost:5000` in `server/.env` and run:

```bash
npm start
```

The whole site is then served from http://localhost:5000.

## If something goes wrong

- **"MONGODB_URI is missing"** in the server terminal: `server/.env` does not exist or the line is empty. The site still opens, but nobody can log in or register until it is set.
- **"Email is not set up yet"** when registering: `RESEND_API_KEY` or `MAIL_FROM` is missing in `server/.env`.
- **The code email never arrives**: check the Logs page in Resend. With `onboarding@resend.dev` as the sender, Resend only delivers to your own account email; verify a domain to send to anyone.
- **"Could not reach MongoDB"**: check the connection string and the password, and that your IP address is in Network Access in Atlas.
- **Port 5173 or 5000 is already in use**: close the other program using it, or change `PORT` in `server/.env`. If you change it, also change the address at the top of `client/vite.config.js`.
- **Pictures show as coloured blocks**: the images have not been added or `npm run images` has not been run yet.
