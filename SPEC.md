# StormChat ⛈️ — build brief

## Pitch

**Chat is the weather.** StormChat is a live stream overlay where Twitch chat changes the weather in the streamer's scene. Hype brings sunshine, chaotic chat brings storms, quiet chat brings fog, and viewers can cast weather spells.

## MVP goals

1. **Explainable mood engine.** Analyze the last 30 seconds of chat every two seconds. Track energy (message rate, caps, exclamation marks, hype words/emotes), positivity (positive and negative words/emotes), chaos (repeats, emote walls, unique chatters), and quiet (low activity). Keep scoring deterministic; no AI is needed.
2. **Weather mapping.** High energy plus positivity → sunshine; high energy plus chaos → thunderstorm; low energy and positive → breeze; negative → drizzle; quiet → fog. Snow is an additional high-chaos effect.
3. **OBS browser-source overlay.** Transparent 1920×1080 page with canvas rain, snow, sun rays, fog, and lightning. Keep the center mostly clear and effects short.
4. **Weather HUD.** Show current icon, one-line forecast with a confidence percentage, and top contributing emote.
5. **Chat spells.** `!rain`, `!sun`, `!snow`, and `!fog` collect one vote per chatter for 20 seconds; enough votes trigger that weather. `!lightning` has a longer cooldown.
6. **Twitch events.** Follow → raindrop plip and name; sub/gift → rainbow and name; cheer → bit gems scaled to amount; raid → storm-front alert sized by viewers; a “Summon a tornado” channel point reward → sweeping tornado.
7. **Dashboard and simulator.** Twitch connection status, climate readout, sensitivity, calm-skies toggle, test actions, and simulated hype / emote storm / silence / rain / Twitch events.

## Architecture

Small Vite + TypeScript app, with `/` as dashboard and `/overlay` as a transparent OBS source. The dashboard owns the Twitch EventSub WebSocket and relays overlay state between same-origin browser tabs. Simulator mode works without Twitch credentials.

## Quality bar

- Smooth canvas animation that keeps the middle of the scene readable.
- Twitch disconnects do not disable the simulator; reconnect automatically and show status.
- No committed secrets and no token logging.
- Cooldowns prevent lightning spam.

## Demo sequence

1. Start with calm skies; trigger a hype burst and let the weather turn sunny or stormy.
2. Show the dashboard and OBS overlay.
3. Cast a spell vote and show the weather respond.
4. Trigger a sub rainbow and raid storm front.
5. Close on the live climate readout. Use the simulator if no live audience is available.

## Stretch work

When the MVP is polished, add `!forecast` chat replies, hour-long climate history and a most-chaotic-minute marker, an end-of-stream climate report, additional streamer effect toggles, and long-session seasonal palettes.
