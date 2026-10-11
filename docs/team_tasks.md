# Team tasks

This is who does what on ArtMind. The shared parts (layouts, components, contexts, the API layer and the mock data) are already built, so Amanda and Shalom can each build their own pages at the same time without touching each other's files.

Every screen has a desktop design in `docs/designs/desktop` and a phone design with the same file name in `docs/designs/mobile`. The one exception is `25_admin_paintings.png`, which has no phone design. The phone version of Admin paintings is ours to design (cards, in the same style as the rest of admin).

## Stanley, team leader

Stanley owns the whole backend and looks after:

- the `server` folder: Express app, models, routes, controllers, services and tests
- the MongoDB Atlas database
- the seed data in `server/data/seed` and `npm run seed`
- the images script `server/scripts/prepareImages.js` and `npm run images`
- `client/src/api`, including the mock adapter in `client/src/api/mock`
- `docs/api.md`, the contract between client and server

Stanley also reviews and merges every pull request.

Right now every API route exists and answers 501 "not built yet", except health, options, FAQ and auth. Auth is finished: register, verify, resend, log in, log out, forgot, reset and me. The six digit code and the reset link are made on the server and emailed through Resend. The schemas, middleware, rate limits, uploads and mail are ready. The work left is the controllers and the services in `server/src/services` (search, recommendations, analytics, palette, recognition, assistant, documents), following `docs/api.md`. When a route is done, the pages can switch from the mock to the real server by setting `VITE_USE_MOCK=false` in `client/.env`.

## Amanda, 15 screens

| No. | Screen | Design file | Route |
|---|---|---|---|
| 01 | Home | `01_home.png` | `/` |
| 02 | Gallery | `02_gallery.png` | `/gallery` |
| 03 | Painting details | `03_painting_details.png` | `/paintings/:slug` |
| 04 | Search results | `04_search_results.png` | `/search?q=` |
| 05 | Identify a style | `05_identify_style.png` | `/identify` |
| 06 | Collections | `06_collections.png` | `/collections` |
| 07 | Collection detail | `07_collection_detail.png` | `/collections/:slug` |
| 08 | Artists | `08_artists.png` | `/artists` |
| 09 | Artist profile | `09_artist_profile.png` | `/artists/:slug` |
| 10 | About | `10_about.png` | `/about` |
| 11 | Contact and FAQ | `11_contact.png` | `/contact` |
| 12 | Not found | `12_not_found.png` | any unknown address |
| 18 | Dashboard | `18_dashboard.png` | `/dashboard` |
| 19 | Favourites | `19_favourites.png` | `/favourites` |
| 24 | Admin overview | `24_admin_overview.png` | `/admin` |

Amanda's page files are in `client/src/pages/public` (all twelve), `client/src/pages/account/Dashboard`, `client/src/pages/account/Favourites` and `client/src/pages/admin/Overview`.

## Shalom, 15 screens

| No. | Screen | Design file | Route |
|---|---|---|---|
| 13 | Log in | `13_login.png` | `/login` |
| 14 | Register | `14_register.png` | `/register` |
| 15 | Verify email | `15_verify_email.png` | `/verify` |
| 16 | Forgot password | `16_forgot_password.png` | `/forgot` |
| 17 | Reset password | `17_reset_password.png` | `/reset/:token` |
| 20 | Profile details, with the Interests and Account tabs | `20_profile_details.png` | `/profile`, `/profile/interests`, `/profile/account` |
| 21 | Profile security | `21_profile_security.png` | `/profile/security` |
| 22 | Assistant page | `22_assistant.png` | `/assistant` |
| 23 | Assistant chat panel | `23_assistant_panel.png` | opens from Ask ArtMind on any page |
| 25 | Admin paintings | `25_admin_paintings.png` | `/admin/paintings` |
| 26 | Admin add and edit painting | `26_admin_add_painting.png` | `/admin/paintings/new`, `/admin/paintings/:id/edit` |
| 27 | Admin artists | `27_admin_artists.png` | `/admin/artists` |
| none | Admin collections | no design, same style as admin artists | `/admin/collections` |
| 28 | Admin users | `28_admin_users.png` | `/admin/users` |
| 29 | Admin messages | `29_admin_messages.png` | `/admin/messages` |

Shalom's page files are in `client/src/pages/auth` (all five), `client/src/pages/account/Profile` (with `DetailsTab`, `InterestsTab`, `SecurityTab` and `AccountTab`), `client/src/pages/account/Assistant` and `client/src/pages/admin` (everything except `Overview`). The chat panel itself is the shared `ChatPanel` component below.

## Shared parts and who looks after them

These are finished and working with the mock data. You can use any of them on your pages. If something needs to change, tell the person who looks after it first.

**Amanda:** Header, Footer, MobileMenu, SiteLayout, PaintingCard, ArtistCard, CollectionCard, FramedImage, Carousel, Pagination, Swatch, Chip, FilterChip, EmptyState, Skeleton, Breadcrumb, StatTile, BarList, LineChart, DonutChart, FavouritesContext. Also Icon, Logo and Avatar, which we added while building the header.

**Shalom:** AuthLayout, AdminLayout, AccountMenu, ChatLauncher, ChatPanel, Button, Select, Checkbox, Toggle, Tabs, Modal, Accordion, PasswordInput, StrengthMeter, CodeInput, TagInput, DataTable, Toast, AuthContext, ChatContext, ToastContext.

**Everyone, through Stanley:** `client/src/styles` (tokens and base styles), `client/src/hooks`, `client/src/utils`, `client/src/routes.jsx`, `client/src/App.jsx` and both `package.json` files. Ask Stanley before changing these, because a change here touches every page.

## Things that help when building a page

- Each page lives in its own folder as `Name.jsx` and `Name.css`. Keep your styles in your page's CSS file and start your class names with the page class that is already there, for example `.page-gallery`.
- Leave `VITE_USE_MOCK=true` while building. The mock adapter answers every endpoint in `docs/api.md` with short delays and keeps your changes in the browser. The one exception is `/api/auth`: logging in, registering, the code and password resets always go to the real server, so run `npm run dev` with `server/.env` filled in and the database seeded.
- Demo logins: `ada@artmind.test` (user) and `admin@artmind.test` (admin), with the passwords set in `SEED_USER_PASSWORD` and `SEED_ADMIN_PASSWORD`.
- The six digit code for Verify email and the Reset password link arrive by email through Resend. To test registering, use an email address you can open.
- To start the mock data again from the seed, run `artmindMock.reset()` in the browser console and reload.
- Fetch data with the functions in `client/src/api` and the `useApi` hook in `client/src/hooks/useApi.js`. Errors come back as `ApiError` with `message`, `code` and `fields`, so forms can show the right message under each field.
- Admin pages start with `<AdminHeader title="...">` from the AdminLayout file. It already holds the account menu.
- Hearts on painting cards work everywhere through FavouritesContext. To open the chat from a page, call `open({ painting })` or `open({ query })` from `useChat()`.
- Wherever an image is missing, FramedImage shows a soft gradient made from the painting's colours, so pages look fine before all the images are generated.
- Check every page at 360px wide. There must be no sideways scrolling.

## How we work

Everyone works only on their own branch: `stanley`, `amanda` or `shalom`. Nobody works straight on `dev` or `main`.

The first time, get the project and make your branch from `dev`:

```bash
git clone <repository address>
cd artmind
git checkout dev
git checkout -b amanda
git push -u origin amanda
```

Before starting each day, bring in what the others have merged:

```bash
git checkout amanda
git pull origin dev
```

While you work, commit small steps with clear messages and push your branch:

```bash
git add .
git commit -m "Gallery filters and sort"
git push origin amanda
```

When a page is done, open a pull request from your branch into `dev` on GitHub and ask Stanley to review it. Stanley reviews, asks for changes if needed and merges.

When `dev` is stable and tested, Stanley merges it into `main`:

```bash
git checkout main
git pull origin main
git merge dev
git push origin main
```

Nobody edits a file someone else looks after without telling them first.
