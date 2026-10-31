# StormChat ⛈️

**Chat is the weather.** StormChat turns the mood of Twitch chat into a transparent OBS overlay: hype brings sunshine, chaos brings storms, and a quiet room rolls in fog.

## Run it locally

```sh
npm install
npm run dev
```

Open the dashboard at `http://localhost:5173`. The simulator works without Twitch credentials. For a standalone demo, open `http://localhost:5173/overlay#sim=1`.

## Connect Twitch

1. Register an application in the [Twitch Developer Console](https://dev.twitch.tv/console/apps). Use `http://localhost:5173` as the OAuth redirect URL and select a public client that supports Device Code Grant.
2. Copy the Client ID to `.env` as `VITE_TWITCH_CLIENT_ID=...` (or paste it when the dashboard asks), then restart Vite.
3. Choose **Connect with Twitch** and approve the app with the broadcaster account. StormChat stores the dashboard's temporary access token in this tab's `sessionStorage`; it never logs the token.
4. Select **Copy OBS overlay URL** in the dashboard. The copied URL contains the access token and settings in its hash fragment, not the query string. OBS loads that URL in its own browser context, where the overlay connects directly to Twitch EventSub and analyzes chat itself.
5. The dashboard and overlay each open an EventSub WebSocket. The current subscriptions are `channel.chat.message` v1, `channel.follow` v2, `channel.subscribe` v1, `channel.subscription.gift` v1, `channel.cheer` v1, `channel.raid` v1, and `channel.channel_points_custom_reward_redemption.add` v1.

The app requests `user:read:chat`, `moderator:read:followers`, `channel:read:subscriptions`, `bits:read`, and `channel:read:redemptions`. Follow events require the authorized account to be a moderator of the broadcaster channel; that is naturally true when you connect as the broadcaster. A custom channel point reward whose title contains “tornado” triggers the tornado effect. If one subscription is unavailable, the others may still connect; the dashboard reports the accepted subscription count. The overlay checks token expiry independently; the dashboard shows a reconnect notice when its connection expires.

Twitch's current OAuth and EventSub requirements can change. See the official [Device Code Grant](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/#device-code-grant-flow), [EventSub WebSocket guide](https://dev.twitch.tv/docs/eventsub/handling-websocket-events/), and [subscription types and scopes](https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/).

## What works

- Deterministic mood analysis over a rolling 30-second window (energy, positivity, chaos, quiet), refreshed every two seconds.
- Canvas weather: sunshine, breeze, rain, fog, snow, and thunderstorm flashes; effects avoid the middle of the frame.
- Dashboard climate readout, forecast, top emote, intensity slider, calm-skies switch, and demo chat scenarios.
- Chat spells `!rain`, `!sun`, `!snow`, and `!fog` use one vote per chatter in a 20-second window. The vote target is a configurable percentage of unique active chatters in the last minute, with a minimum of two and maximum of five votes. `!lightning` has a 60-second per-chatter cooldown.
- Follow plip, sub rainbow, cheer gems, raid alert, lightning, and channel point tornado effects.
- Twitch disconnect recovery and simulator mode when Twitch is not connected.

## Project structure

- `src/main.ts` — app orchestration and Twitch event handling.
- `src/dashboard.ts` — dashboard UI and controls.
- `src/overlay.ts` — standalone OBS overlay and HUD.
- `src/spells.ts` — spell voting, thresholds, and cooldowns.
- `src/simulator.ts` — simulated chat scenes and events.
- `src/state.ts` — app state and safe overlay hash parameters.
- `src/mood.ts` — explainable keyword/rate-based climate scoring.
- `src/weather.ts` — canvas particles and event animations.
- `src/twitch.ts` — device authorization and EventSub WebSocket client.
- `SPEC.md` — product brief and MVP acceptance goals.

## OBS setup

1. Start StormChat and open the dashboard. Choose **Connect with Twitch** for a live overlay, or use the simulator if you want a token-free preview.
2. In OBS, choose the scene that will show the effects. In **Sources**, select **+ → Browser** and create a Browser Source.
3. In the Browser Source properties, leave **Local file** off. For a live overlay, paste the URL from **Copy OBS overlay URL**. For a local simulator preview, use `http://localhost:5173/overlay#sim=1`.
4. Set **Width** to `1920` and **Height** to `1080`.
5. Leave **Shutdown source when not visible** off so the overlay's EventSub connection can stay alive when you switch scenes.
6. Select **OK**, then check that the weather HUD appears over the scene. The page background is transparent.

The copied live URL carries a Twitch access token in the fragment after `#`. Keep it private like a password; anyone with the URL can use the granted access until the token expires or is revoked. Do not paste it into chat, public screenshots, or source control. The dashboard cannot share local storage with OBS's embedded browser, so the overlay uses its own token and EventSub connection instead.

## How I used Codex

Codex worked through the build brief in milestones:

1. Set up the Vite + TypeScript app and transparent canvas overlay.
2. Added deterministic mood scoring and simulated chat scenes.
3. Added Twitch Device Code authorization and EventSub WebSocket subscriptions.
4. Added chat spells, cooldowns, scaled vote thresholds, and overlay vote progress.
5. Connected follow, subscription, cheer, raid, and channel point events to weather animations.
6. Added the HUD, forecast, simulator controls, calm-skies control, and standalone OBS URL flow.
7. Documented Twitch registration, OAuth scopes, and OBS Browser Source setup.

## Scope notes

StormChat is a browser-only demo. OAuth tokens are kept in session storage, but a browser-only app cannot protect secrets from browser extensions or other scripts running on the same origin. Do not add a client secret to this project. Chat responses for `!forecast`, persistent climate history, and season palettes are not part of the current MVP.

## Deploy on Vercel

StormChat is a Vite single-page app. The included `vercel.json` rewrites `/overlay` and `/dashboard` to `index.html` while preserving each URL, so OBS can load the standalone overlay route directly.

1. Push the repository to GitHub. In [Vercel](https://vercel.com), choose **Add New… → Project**.
2. Under **Import Git Repository**, find `Codex-Twitch` and click **Import**. If it is not listed, click **Adjust GitHub App Permissions** and grant Vercel access to this repository, then return and import it.
3. In project configuration, confirm **Framework Preset: Vite**, **Build Command: `npm run build`**, and **Output Directory: `dist`**. Leave the install command as `npm install`.
4. Expand **Environment Variables** and add `VITE_TWITCH_CLIENT_ID` with the Client ID from your Twitch app. Apply it to Production (and Preview if desired). Do not add a Twitch client secret.
5. Click **Deploy**. When it finishes, open the assigned `https://<project>.vercel.app` domain and verify `/dashboard` and `/overlay#sim=1` load.
6. In the Twitch Developer Console, open **Applications → Manage** for the same app. Add the deployed origin, such as `https://<project>.vercel.app`, under **OAuth Redirect URLs**, click **Add**, then **Save**. Keep `http://localhost:5173` registered too if you use the local development server. StormChat's device-code flow does not redirect back to this URL, but Twitch requires registered redirect URL configuration for an application.
7. In the deployed dashboard, connect Twitch and choose **Copy OBS overlay URL**. Paste that URL into the OBS Browser Source. For demos, use `https://<project>.vercel.app/overlay#sim=1`.

Vercel creates future deployments from GitHub pushes. See Vercel's [Vite deployment guide](https://vercel.com/docs/frameworks/frontend/vite) and [rewrite configuration](https://vercel.com/docs/routing/rewrites), plus Twitch's [app registration steps](https://dev.twitch.tv/docs/authentication/register-app/).
