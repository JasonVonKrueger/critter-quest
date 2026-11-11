# Critter Quest 🌱

A cooperative mobile-browser game for two little friends. Phases 1–5 provide a multiplayer Bunny’s Garden mission, audio and hugs, and a shared saved sanctuary with temporary artwork.

## Run locally

Requires Node.js 22.12+ and npm.

```sh
npm install
npm run dev
```

Open http://localhost:5173. Create a garden in one tab, then open the invitation link in a **second tab** and join with the code. Each tab keeps its own reconnect token in sessionStorage. Reloading a connected tab resumes its existing player. Some browsers copy sessionStorage into duplicated tabs: use a fresh tab rather than Duplicate Tab to test the second player.

Each child selects Raelyn or Cooper, chooses Explorer or Helper, and taps “I’m ready!” Names and roles are exclusive within a room, and either child can play either role. The server starts the adventure team only when both players are connected and ready. Once both players are ready, each enters their role’s mission screen. Rooms reserve both slots even after disconnect; create a new room for a fresh session. State is saved to a server-side SQLite database and restored after restarts. Sessions have no expiration or cleanup yet; this is a local development foundation, not a public production service.

For two phones on your local Wi-Fi, visit your computer’s LAN IP at port 5173. Vite proxies Socket.IO to port 3001, so no client URL override is necessary. Clipboard sharing requires a secure context on most phones; the visible room code also works. Allow local firewall access if required.

## Structure

- `client/`: React menus, responsive CSS, and a lifecycle-managed Phaser preview.
- `server/`: Express health endpoint, Socket.IO transport, authoritative RoomManager.
- `shared/`: TypeScript room state and Socket.IO event contracts.
- `client/public/assets/`: reserved art folders. All current game-world art is explicitly temporary.

Role identifiers describe gameplay responsibilities rather than children’s names. Socket event handlers delegate room decisions to RoomManager. Server-issued opaque tokens recover the existing seat after a transient disconnect. A replacement socket takes over the token’s connection.

## Checks and builds

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

`npm run build` writes client static output to `client/dist` and compiled server output to `server/dist`. Run the built server using `npm run start -w server`; use `npm run preview -w client` to inspect the frontend build. The local preview proxies API and Socket.IO traffic to port 3001, just like development. For hosting on different origins, configure `VITE_SERVER_URL` at build time and `CLIENT_ORIGIN` for the server. Production hosting must route `/socket.io` to the server or supply that explicit URL. The configured preview proxy is for local verification; production hosting still needs its own reverse proxy.

`GET /api/health` on port 3001 reports server health. Configuration is documented in `.env.example`; export server variables in the shell. Vite reads client variables from `client/.env.local`. The server uses `PORT=3001` and `CLIENT_ORIGIN=http://localhost:5173` by default.

## Next phases

1. Lobby identity, role selection, readiness, and reconnection are complete.
2. Carrot growth, transfers, feeding, and server-owned mission completion are complete.
3. Replace placeholder artwork; add reusable Phaser animations, audio, Pip narration, and hugs.
4. Shared sanctuary and SQLite persistence behind a storage interface are complete.

No child information, public discovery, chat, purchases, or analytics are included.

## Phase 2 acceptance check

1. Create a room in a fresh tab and join from a second fresh tab.
2. Choose Raelyn / Explorer in one and Cooper / Helper in the other, confirming each selection. Try selecting an occupied name or role; it should be unavailable.
3. Tap “I’m ready!” on one device. It waits for the other. Tap ready on the other; both enter their role’s mission screen.
4. Reload either tab: its name, role, and team state return automatically.
5. Before starting a new team, disconnect one device: the other shows “Reconnecting…”. The disconnected player must confirm ready again after reconnecting. After the team starts, disconnects retain that started state.

Existing rooms and player seats survive backend restarts. Connected players reconnect automatically; saved-player buttons let a parent return after closing the browser tab.

## Phase 3: play Bunny’s Garden

1. Create/join a room and choose one Explorer and one Helper. Both tap ready.
2. Explorer: tap the bunny to discover its hunger.
3. Helper: plant each patch, drag the watering can over it, then tap again to send. Use the large buttons or the patches in the Phaser scene.
4. Explorer: each sent carrot appears in the basket. Tap a landed carrot to feed it to the bunny.
5. After three feedings, both screens celebrate and show three stars and the bunny unlock.
6. Reload either player midway through: patch stages, basket inventory, and feeding progress return.

The server validates roles, expected patch stages, and individual carrot IDs. Duplicate collection/feeding packets cannot create additional items or rewards. Mission progress and unlocks are saved on the server and appear in the shared sanctuary. After completion, both children can tap “Play again together” to start another round. Phase 4 adds browser narration, synthesized sound effects, and shared hugs. Finished artwork remains pending individual assets.

## Mobile layout

Gameplay uses a phone-sized viewport with safe-area padding, a flexible Phaser scene, and bottom controls. The page does not scroll during play. Portrait is primary; short landscape screens use a side-by-side layout. The parent lobby can scroll and keeps create/join and identity controls ahead of decorative content. Room-code input uses 16px text to avoid iOS focus zoom.

To test on a phone on the same Wi-Fi, run `npm run dev` and open the Network URL printed by Vite (for example `http://192.168.x.x:5173`). Both phones must reach the development computer. Remote play across different networks requires hosted deployment; localhost is only accessible on the device running the server. Test Safari and Chrome with browser chrome visible, after rotation, and after backgrounding/reopening the tab. No native app installation is needed.

## Phase 4: audio and hugs

- Tap ✨ Pip to hear the current instruction again. Instructions also update as mission progress changes; visible text remains when speech is unavailable.
- The speaker button mutes both narration and effects. The preference is saved on this browser.
- Mobile browsers require interaction before sound can play: tap Pip or a game control to enable audio. Speech voices depend on the device; no recorded voice assets are included yet.
- Tap “Send a hug” to float hearts on the other player’s screen, including after mission completion. The sender sees “Hug on its way!” without the receiving animation. Each player has a server-enforced three-second cooldown, preserved across reconnects. Hugs are transient and are not replayed after reconnect.
- Phaser canvases resize to their containers; grass extends across the entire scene while the central play area stays in view.

Verified with nine logic tests, TypeScript, ESLint, the production build, and a live two-client hug broadcast/cooldown check. Browser visual inspection was unavailable; confirm grass width, audio permission behavior, and touch layout on both target phones.

## Phase 5: shared sanctuary and saved gardens

Tap **Sanctuary** during or after the mission. Before rescue, the habitat is waiting; after three feedings, both children see their bunny and three shared stars. Tap the bunny to visit, and tap **Adventure** to return. Each player can navigate independently.

The shared garden is the MVP game profile. Room state, roles, mission inventory, rewards, and opaque reconnect tokens are persisted together. The landing screen lists up to six recently used player seats stored in this browser. Use the correct named seat when returning. Choosing a seat that is already open elsewhere transfers that connection. A fresh tab still allows a second player to join normally; saved seats are never resumed automatically from localStorage.

- Default save file: `server/data/games.sqlite` when launched via the npm scripts. This directory is ignored by Git.
- Override with server environment variable `DATABASE_FILE`; use an absolute path on hosted deployments and a persistent disk.
- Saves use a better-sqlite3 transaction for room and session changes, with WAL journaling and full synchronous durability. Failed writes roll back the action and report an error. Unsupported database versions stop startup rather than discarding progress.
- Stop the server before copying the SQLite file for backup, or use SQLite’s online backup tooling; do not copy only the main file while WAL writes may be pending. Keep it private: it contains bearer reconnect tokens. No birthdays, contact details, accounts, or other child information are requested.
- The server still supports one backend process: RoomManager owns in-memory state, and the SQLite store commits full snapshots. Multiple server processes need coordinated state ownership before sharing a database.
- Rooms and seats do not expire yet. There is no cross-device account recovery. A new device can use an unoccupied seat via the room code; recovering an occupied saved seat requires its existing browser storage.

Acceptance check: complete a mission, open Sanctuary on both phones, restart the server, and reload both pages. The same bunny and stars should return. Close a tab, open the landing page again, and choose its saved player. Clearing browser storage removes that browser’s saved-seat access, but does not delete the server’s progress.

## Play again together

After completing a round, tap **Play again together** on both devices. The first tap waits; tap again to cancel. Once both connected children agree, their garden starts a fresh round with the same names and roles. Disconnecting cancels that player’s vote; restarting the server clears all replay votes.

The bunny and three shared sanctuary stars remain unlocked during replays. This mission grants the sanctuary reward once per garden; replaying still shows a three-star celebration without adding duplicate unlocks or increasing the saved total. Existing save files migrate automatically. Every action includes its round number so delayed taps from a previous round cannot affect the next one.

Validation includes 16 automated tests, typecheck, lint, production build, and a live two-client replay check. On phones, finish a mission, vote on one device, cancel and vote again, then vote on the other. Confirm both return to fresh patches and can still visit their bunny in Sanctuary.

## Installable PWA

The production build includes a web app manifest, full-body bunny app icons (192px, 512px, maskable, and Apple touch icon), and a service worker generated by `vite-plugin-pwa`. The app launches in standalone mode and requests portrait orientation where supported.

```sh
npm run check:pwa
npm run preview -w client
```

Open http://localhost:4173 to inspect the built app. Keep the backend running on port 3001 for local multiplayer. The development server intentionally does not enable service-worker caching. `check:pwa` builds and checks the manifest, icon dimensions, Apple metadata, and generated worker artifacts.

**On phones, serve the production build over HTTPS.** A plain HTTP LAN address is useful for gameplay development but does not meet PWA installation/service-worker requirements. Install from the parent landing screen using **Install Critter Quest** when the browser supplies an install prompt. Otherwise use the browser’s installation menu. On iPhone/iPad, open in Safari, tap Share, then Add to Home Screen. The app hides installation controls when it detects standalone mode.

The service worker precaches the app shell, local icons, JavaScript, and CSS. After one successful online visit, the shell can reopen offline. Multiplayer, server progress, API calls, and Socket.IO remain online-only; no gameplay actions are queued offline. External fonts fall back to system fonts when unavailable.

Updates wait for confirmation on the landing/lobby screen. Choose **Update & reopen** when nobody is playing; the app never intentionally forces a reload during a mission. Close/reopen an installed app to reach the landing screen and saved-player buttons when an update is ready.

For deployment, serve `client/dist` over HTTPS and reverse-proxy `/socket.io` (including WebSocket upgrades) and `/api` to the backend. Keep the manifest, icons, service worker, and app on the same origin. Serve `sw.js` and `index.html` with revalidation (`Cache-Control: no-cache`); hashed assets can use long-lived immutable caching. Keep the server’s save directory on persistent storage.

Phone acceptance checks: install from Android and iOS, open from the home-screen icon, verify safe areas and audio, reconnect both saved players, reopen offline after a successful online visit, then reconnect. Deploy a new build and confirm updates wait for an explicit choice. Actual device installation still needs a target-phone check.

Icon source is `client/public/icons/bunny.svg`. To regenerate PNG placeholders, run `python3 scripts/generate-icons.py` with Pillow installed.

## SQLite persistence

The server uses `better-sqlite3` through `SqliteGameStore`, retaining the existing `GameStore` interface. Rooms are stored as JSON documents in a `rooms` table; reconnect tokens and player references live in `sessions`, with a room foreign key. All snapshot changes commit in a single transaction. `PRAGMA user_version` tracks schema version.

On first use of an empty database, the server imports `server/data/games.json` if it exists. The original JSON is left untouched, and subsequent starts use SQLite. Override the import path with `LEGACY_DATA_FILE`; the old `DATA_FILE` variable is also accepted as an import path. Choose a database location with `DATABASE_FILE`. Invalid imports stop startup and leave the database uninitialized so the import can be retried after correction. Existing room/save-schema migrations still apply.

`better-sqlite3` includes a native addon. Dependency installation must allow its install script. The repository’s npm `allowScripts` entry approves the installed version; upgrades may require approving the new version. Run `npm test` to verify imports, SQLite reopen/recovery, transaction rollback, and gameplay persistence.

## Bunny artwork v1

The first polished art asset is installed: a transparent four-pose bunny sprite sheet in `client/public/assets/characters/bunny/`. The Phaser atlas aligns each pose’s feet and centers the bunny consistently. It supports idle blinking, a happy reaction to taps/hugs, an eating pose on feeding, and a happy celebration after the final carrot. The meadow preview and sanctuary share the same art.

The PNG is preserved unchanged from built-in image generation; the atlas handles frame extraction and alignment at runtime. Full generation prompt and asset notes are in `client/public/assets/characters/bunny/README.md`. Backgrounds, Pip, carrots, and effects remain the next art passes. The older vector bunny remains only as a fallback if loading the new asset fails. The PWA precaches both the PNG and atlas JSON for offline shell rendering.

Carrot arrivals now land beside the bunny, where available carrots remain visible. Tap a landed carrot to feed it; only that action triggers the eating pose. The separate basket button has been removed.

## Environment artwork v1

Illustrated meadow and garden backgrounds replace the decorative tree/house/butterfly emoji and flat scenery. The meadow includes a cozy tree house, flowers, fence, and forest; the garden includes a watering can, barrel, and sunflowers. Both fill the viewport using cover scaling while characters and tap targets remain separate. Art and exact generation prompts are in `client/public/assets/backgrounds/`. PWA precaching includes both images. Pip, carrot growth sprites, and effects remain future artwork passes.

## Start over mid-adventure

**Start over** is available during an unfinished adventure and in Sanctuary. One player requests a reset; the other sees the request and taps the same button to agree. Either can cancel their own request before the reset. Both must be connected. This clears the current round’s patches, carrots, feedings, and bunny greeting, while retaining names, roles, and previously earned sanctuary rewards. Completed rounds keep the **Play again together** label.

## Drag to water

Drag the blue watering can beside the barrel over a planted patch to tilt and pour. It always has water; the barrel is decorative. Invalid drops return it home without changing the patch. Tapping a planted patch now reminds the child to drag the can. Planting and collecting remain taps. The can is an independent transparent sprite, and `garden-v2.png` removes the old painted-in can so there is no duplicate left behind during dragging.

The experimental bunny ear mesh has been removed because of reported flicker. The normal sprite renderer handles blinking and pose changes again; independent floppy ears are deferred until a properly layered character rig is available.

Dragging a filled can over a planted patch now starts watering immediately: the can tilts and a short stream flows from its spout onto that patch before it returns home. Releasing is not required to start pouring.

Patches now begin as sprouts, including after Start over. There is no planting tap. Drag the watering can over a sprout; it becomes a ready carrot only after the tilt-and-pour sequence finishes. Tap the ready carrot to send it. Existing untouched patches migrate to sprouts on server startup.

## Return to the main page

Tap the top-left **Critter Quest** logo from the adventure, sanctuary, or lobby. This closes that player's current connection and clears only the tab's automatic resume token. The garden and named player seat remain saved: choose the player under **Welcome back** to return. The other player's screen shows the disconnect; Home does not reset the mission or delete rewards.

## Production PM2 setup and 502 troubleshooting

From `/home/hosted-apps/critter-quest`, run `npm ci` and `npm run build`, then use `pm2 startOrReload ecosystem.config.cjs --only critter-quest --update-env` and `pm2 save`. The checked-in ecosystem config uses absolute paths relative to the checkout, one forked backend process, the production origin, and `server/data/games.sqlite`. Nginx still serves `client/dist` and proxies API/Socket.IO to port 3001.

For 502 errors, first run `pm2 logs critter-quest --lines 80 --nostream` and `curl -i http://127.0.0.1:3001/api/health` on the server. If the local health request fails, fix the backend error shown in PM2 logs. If it succeeds while the public endpoint fails, inspect `sudo tail -n 50 /var/log/nginx/error.log` and the active Nginx configuration. Native SQLite dependencies must be installed on the server with the same Node version used by PM2. The service user must be able to write the database directory.

The bunny now starts cheerful, then becomes gently sad after a random 10–20 seconds without eating. Each feeding resets the server-generated, saved deadline. Reconnecting preserves the deadline; finished missions keep the bunny happy. There is no visible countdown, penalty, or lost progress.

## Animated clouds

The meadow, garden, and landing preview now use cloud-free backgrounds with independent cloud sprites drifting slowly at different speeds. Only the clouds move; scenery and gameplay stay fixed. Cloud layers resize with the environment, remain clipped to the sky, and stop drifting when the device requests reduced motion. New artwork, sources, and prompts are documented in `client/public/assets/effects/cloud-v1.md`.

## One, two, three carrot levels

New adventures start at level 1 with one centered sprout. Feeding its carrot advances both players to level 2 with two sprouts. Feed both to advance to level 3 with three sprouts. Feed all three to complete the adventure (six carrots total). Each level resets the patches, shows a brief level-up message, and updates the shared carrot goal. The bunny and sanctuary stars are awarded once after level 3. Start over/replay returns to level 1.

Levels and feeding progress persist in SQLite. Each level advances the action round ID so late packets cannot affect the new sprouts. Existing saves from the earlier three-patch game remain at level 3 with their current progress; choose Start over to try the new progression.

## Level 4: Snake’s Riverbank

After the six carrots in levels 1–3 are fed, the server exchanges Explorer/Helper roles exactly once. The old grower now feeds a friendly snake; the old feeder grows a rabbit in a magical burrow by dragging the watering can over it. Tap the grown rabbit to send it, then tap the landed rabbit on the other screen to feed the snake. This first snake level has one burrow. The new setting is a jungle river clearing with its own snake and rabbit sprite atlases. Feeding uses a closed-mouth gulp with no graphic imagery.

The bunny reward is saved after level 3. Finishing level 4 adds the snake and another three shared stars. Both players agreeing to Start over restores their original jobs and level 1. Reconnecting or restarting preserves the new jobs and level. Previously completed gardens remain completed; Start over to try the expanded adventure.

Artwork paths, exact prompts, and generation notes are in `client/public/assets/characters/snake/README.md`. The PWA precaches the new PNGs and atlases.

The snake adventure now spans levels 4–6: one rabbit burrow, then two, then three. Jobs swap only at level 4 and stay exchanged until Start over. Feed all six rabbits to finish. Previously saved completed single-level snake adventures resume at level 5; earned rewards are retained. New adventures award the snake’s three stars after level 6.

## Looking toward landed food

The snake and big bunny now choose left/down/right eye poses based on the most recently landed food item. In-flight items do not attract their gaze yet. After feeding, gaze follows another waiting item or returns forward when none remain. Blink, eating, and happy reaction frames temporarily take precedence. Hungry bunny gaze preserves the sad expression. New sprites and generation prompts are documented in `client/public/assets/characters/gaze-art.md`.

## Levels 7–9: Hawk’s Highland

After level 6 the players swap jobs again and move from the jungle to a pine-lined mountain clearing. Grow one, then two, then three snakes by watering the magical egg nests. Send each grown snake to the other player, who taps the landed item to feed the friendly hawk. The hawk blinks, looks toward waiting food, and uses a brief closed-beak gulp. The existing whoosh and pouring effects continue.

Finishing level 9 saves the hawk and three more stars (nine shared stars total). Start over restores level 1 and original roles. Older completed level-6 saves continue at level 7 automatically with the correct second role swap and existing rewards intact. Artwork paths and exact prompts are in `client/public/assets/characters/hawk/README.md`.

## Levels 10–12: Owl’s Moonlit Hollow

The next chapter moves to a moonlit forest with a hollow tree, silver moon, and glowing flowers. Jobs swap again at level 10. Grow one, two, then three hawks in magical nests and send them to the owl’s feeder. The owl blinks, looks toward landed food, and has happy, hungry, and gentle feeding poses. Existing drag-to-water, arrival, whoosh, and hug interactions continue.

Finishing level 12 saves the owl and three more stars (12 shared stars total). Previously completed level-9 gardens resume at level 10 with the correct third role swap. Start over restores the original roles and level 1. Exact artwork prompts and asset paths are in `client/public/assets/characters/owl/README.md`.

The owl now has a six-frame feather-fluff sprite animation. It plays occasionally while idle (about every 6–11 seconds), then returns to the current gaze and expression. Feeding and other reactions interrupt it. Feet are aligned in atlas metadata so the body does not float. Reduced-motion mode leaves it disabled. Assets and generation notes: `client/public/assets/characters/owl/owl-fluff-v1.md`.

## Levels 13–15: Bobcat’s Woodland

After level 12, jobs swap again and the adventure moves to an autumn woodland clearing. The grower waters owl eggs in magical nests, then sends the hatched owls to the bobcat’s feeder. Levels 13, 14, and 15 require one, two, and three meals. The bobcat blinks, looks toward landed owls, and has hungry, happy, and feeding poses. Feeding stays non-graphic.

Completing level 15 saves the bobcat and three more stars (15 total, 30 meals across the adventure). Completed owl saves open at level 13 with one role swap; reconnects preserve the current chapter and jobs. Start over restores level 1 and the original jobs. Artwork paths and exact built-in imagegen prompts are documented in `client/public/assets/characters/bobcat/README.md`.
