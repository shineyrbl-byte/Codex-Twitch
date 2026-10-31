# StormChat ⛈️

**Chat is the weather.** StormChat turns the mood of Twitch chat into a transparent OBS overlay: hype brings sunshine, chaos brings storms, and a quiet room rolls in fog.

## Run it locally

```sh
npm install
npm run dev
```

Open the dashboard at `http://localhost:5173`. The simulator works without Twitch credentials. Open `/overlay` in a second tab to preview the transparent Browser Source; add `http://localhost:5173/overlay` as an OBS Browser Source at 1920×1080.

## Connect Twitch

1. Register an application in the [Twitch Developer Console](https://dev.twitch.tv/console/apps). Use `http://localhost:5173` as the OAuth redirect URL and select a public client that supports Device Code Grant.
2. Copy the Client ID to `.env` as `VITE_TWITCH_CLIENT_ID=...` (or paste it when the dashboard asks), then restart Vite.
3. Choose **Connect with Twitch** and approve the app with the broadcaster account. StormChat stores the temporary access token in this tab's `sessionStorage`; it never logs the token.
4. The dashboard opens one EventSub WebSocket. Its current subscriptions are `channel.chat.message` v1, `channel.follow` v2, `channel.subscribe` v1, `channel.subscription.gift` v1, `channel.cheer` v1, `channel.raid` v1, and `channel.channel_points_custom_reward_redemption.add` v1.

The app requests `user:read:chat`, `moderator:read:followers`, `channel:read:subscriptions`, `bits:read`, and `channel:read:redemptions`. Follow events require the authorized account to be a moderator of the broadcaster channel; that is naturally true when you connect as the broadcaster. A custom channel point reward whose title contains “tornado” triggers the tornado effect. If one subscription is unavailable, the others may still connect; the dashboard reports the accepted subscription count.

Twitch's current OAuth and EventSub requirements can change. See the official [Device Code Grant](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/#device-code-grant-flow), [EventSub WebSocket guide](https://dev.twitch.tv/docs/eventsub/handling-websocket-events/), and [subscription types and scopes](https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/).

## What works

- Deterministic mood analysis over a rolling 30-second window (energy, positivity, chaos, quiet), refreshed every two seconds.
- Canvas weather: sunshine, breeze, rain, fog, snow, and thunderstorm flashes; effects avoid the middle of the frame.
- Dashboard climate readout, forecast, top emote, intensity slider, calm-skies switch, and demo chat scenarios.
- Chat spells `!rain`, `!sun`, `!snow`, and `!fog` use one vote per chatter in a 20-second window. Five votes trigger the selected weather for 20 seconds. `!lightning` has a 60-second per-browser cooldown.
- Follow plip, sub rainbow, cheer gems, raid alert, lightning, and channel point tornado effects.
- Twitch disconnect recovery and simulator mode when Twitch is not connected.

## Project structure

- `src/main.ts` — dashboard, overlay, simulator, spells, and app state.
- `src/mood.ts` — explainable keyword/rate-based climate scoring.
- `src/weather.ts` — canvas particles and event animations.
- `src/twitch.ts` — device authorization and EventSub WebSocket client.
- `SPEC.md` — product brief and MVP acceptance goals.

## Scope notes

StormChat is a browser-only demo. OAuth tokens are kept in session storage, but a browser-only app cannot protect secrets from browser extensions or other scripts running on the same origin. Do not add a client secret to this project. Chat responses for `!forecast`, persistent climate history, and season palettes are not part of the current MVP.
