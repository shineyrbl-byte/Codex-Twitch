import "./style.css";
import { analyze, withWeather } from "./mood";
import { WeatherCanvas } from "./weather";
import { startDeviceFlow, TwitchConnection } from "./twitch";
import {
  bindDashboard,
  drawChat,
  drawMetrics,
  renderDashboard,
  setDashboardText,
} from "./dashboard";
import { renderOverlay, updateOverlay } from "./overlay";
import { EVENT_LAYOUT } from "./event-layout";
import { SpellController, type SpellProgress } from "./spells";
import { startOverlaySimulator, startScenario } from "./simulator";
import { createState, makeOverlayUrl, readOverlayOptions } from "./state";
import type { ChatMessage, Weather, WeatherEvent } from "./types";

const root = document.querySelector<HTMLDivElement>("#app")!;
document.documentElement.style.setProperty(
  "--event-toast-top",
  `${EVENT_LAYOUT.alertTopPercent}%`,
);
const overlayMode = location.pathname === "/overlay";
if (overlayMode) {
  document.documentElement.classList.add("overlay-route");
  document.body.classList.add("overlay-route");
}
const state = createState(
  overlayMode
    ? 30
    : Number(localStorage.getItem("stormchat_spell_threshold")) || 30,
);
const icons: Record<Weather, string> = {
  sun: "☀️",
  storm: "⛈️",
  breeze: "🌤️",
  rain: "🌧️",
  fog: "☁️",
  snow: "❄️",
};

let accessToken = sessionStorage.getItem("stormchat_token") || "";
let weatherCanvas: WeatherCanvas;
let deviceAbort: AbortController | undefined;
let spellProgress: SpellProgress = { count: 0, required: 2, text: "", fill: 0 };
let stopScenario = () => {};

const twitch = new TwitchConnection(
  handleTwitch,
  updateConnectionStatus,
  showReconnectNote,
);
const spells = new SpellController(
  () => state.messages,
  () => state.spellThresholdPercent,
  (progress) => {
    spellProgress = progress;
    updateSpellProgress();
  },
  castWeather,
  (user) => showEvent({ kind: "lightning", name: user, at: Date.now() }),
);

if (overlayMode) {
  mountOverlay();
} else {
  mountDashboard();
}

function mountOverlay(): void {
  const options = readOverlayOptions(location.hash);
  state.sensitivity = options.sensitivity;
  state.spellThresholdPercent = options.spellThresholdPercent;
  state.simulator = options.simulator;
  weatherCanvas = new WeatherCanvas(renderOverlay(root, state.climate));
  updateClimate();
  window.setInterval(tick, 2_000);

  if (options.simulator && options.demo) {
    startOverlayDemo(options.demo);
  } else if (options.simulator) {
    startOverlaySimulator((messages) => {
      if (!messages.length) state.messages.length = 0;
      else state.messages.push(...messages);
      tick();
    }, showEvent);
  } else if (options.token && options.clientId) {
    twitch.connect(options.clientId, options.token).catch(() => {
      // Keep authentication details out of the stream overlay and its console.
    });
  }
}

function startOverlayDemo(demo: string): void {
  const demoScenes: Record<string, { scene: string; weather: Weather }> = {
    sun: { scene: "hype", weather: "sun" },
    storm: { scene: "chaos", weather: "storm" },
    rain: { scene: "negative", weather: "rain" },
    fog: { scene: "quiet", weather: "fog" },
    snow: { scene: "quiet", weather: "snow" },
  };
  const selected = demoScenes[demo.toLowerCase()];
  if (selected) {
    state.demoWeather = selected.weather;
    runScenario(selected.scene);
    return;
  }
  if (demo.toLowerCase() === "sub" || demo.toLowerCase() === "raid") {
    state.messages.length = 0;
    state.demoWeather = "sun";
    const kind: WeatherEvent["kind"] =
      demo.toLowerCase() === "sub" ? "sub" : "raid";
    showEvent({
      kind,
      name: demo.toLowerCase() === "sub" ? "Mika" : "PixelParty",
      amount: demo.toLowerCase() === "raid" ? 24 : undefined,
      at: Date.now(),
    });
    tick();
    return;
  }
  startOverlaySimulator((messages) => {
    if (!messages.length) state.messages.length = 0;
    else state.messages.push(...messages);
    tick();
  }, showEvent);
}

function mountDashboard(): void {
  renderDashboard(
    root,
    state.climate,
    state.sensitivity,
    state.spellThresholdPercent,
  );
  weatherCanvas = new WeatherCanvas(document.querySelector("#weather")!);
  bindDashboard({
    onSimulator: runScenario,
    onEvent: (kind) =>
      showEvent({
        kind,
        name: kind === "raid" ? "PixelParty" : "Mika",
        amount: kind === "cheer" ? 250 : kind === "raid" ? 24 : undefined,
        at: Date.now(),
      }),
    onSpell: (spell, user) => spells.cast(spell, user),
    onIntensity: (value) => {
      state.sensitivity = value;
      setDashboardText("intensity-value", `${value}%`);
      updateClimate();
    },
    onThreshold: (value) => {
      state.spellThresholdPercent = value;
      localStorage.setItem("stormchat_spell_threshold", String(value));
      setDashboardText("spell-threshold-value", `${value}%`);
      spells.refresh();
    },
    onCalm: () => {
      state.calm = !state.calm;
      weatherCanvas.setCalm(state.calm);
      return state.calm;
    },
    onLightning: () =>
      showEvent({ kind: "lightning", name: "You", at: Date.now() }),
    onClear: clearChat,
    onCopyOverlay: copyOverlayUrl,
    onConnect: startTwitchAuthorization,
    onDisconnect: disconnectTwitch,
  });
  drawMetrics(state.climate);
  drawChat(state.messages);
  updateClimate();
  window.setInterval(tick, 2_000);

  if (accessToken) {
    connectDashboardToken(accessToken).catch(() => {
      sessionStorage.removeItem("stormchat_token");
      accessToken = "";
      showReconnectNote();
    });
  }
}

function updateConnectionStatus(status: string): void {
  const element = document.querySelector("#connection-status");
  if (!element) return;
  element.textContent = status;
  document
    .querySelector("#status-dot")
    ?.classList.toggle("connected", status.includes("Connected"));
}

function showReconnectNote(): void {
  if (overlayMode) return;
  document.querySelector("#reconnect-note")?.removeAttribute("hidden");
  document.querySelector<HTMLButtonElement>("#connect-twitch")!.hidden = false;
  document.querySelector<HTMLButtonElement>("#disconnect")!.hidden = false;
  updateConnectionStatus("Reconnect needed");
}

function twitchClientId(): string {
  return (
    import.meta.env.VITE_TWITCH_CLIENT_ID ||
    localStorage.getItem("stormchat_client_id") ||
    ""
  );
}

async function startTwitchAuthorization(): Promise<void> {
  let clientId = twitchClientId();
  if (!clientId) {
    clientId =
      prompt(
        "Paste your Twitch Developer Client ID. You can save it in .env as VITE_TWITCH_CLIENT_ID.",
        "",
      ) || "";
    if (!clientId) return;
    localStorage.setItem("stormchat_client_id", clientId);
  }

  deviceAbort = new AbortController();
  const button = document.querySelector<HTMLButtonElement>("#connect-twitch")!;
  button.disabled = true;
  button.textContent = "Waiting for Twitch…";
  try {
    await startDeviceFlow(
      clientId,
      (code, url) => {
        const opened = window.open(url, "_blank", "noopener,noreferrer");
        document.querySelector("#connect-note")!.innerHTML =
          `Enter this code on Twitch: <strong class="auth-code">${code}</strong> · <a target="_blank" rel="noreferrer" href="${url}">Open activation page</a>${opened ? "" : " (allow pop-ups to open Twitch)"}`;
        updateConnectionStatus("Waiting for Twitch authorization…");
      },
      (token) => {
        accessToken = token;
        sessionStorage.setItem("stormchat_token", token);
      },
      deviceAbort.signal,
    );
    if (accessToken) await connectDashboardToken(accessToken);
  } catch (error) {
    alert(error instanceof Error ? error.message : String(error));
    updateConnectionStatus("Simulator ready");
  } finally {
    button.disabled = false;
    button.innerHTML = "<span>◉</span> Connect with Twitch";
  }
}

async function connectDashboardToken(token: string): Promise<void> {
  const clientId = twitchClientId();
  if (!clientId) throw new Error("Add a Twitch client ID to connect.");
  await twitch.connect(clientId, token);
  state.simulator = false;
  setDashboardText("channel-name", "Twitch channel");
  setDashboardText(
    "connect-note",
    "Listening to live chat through Twitch EventSub.",
  );
  document.querySelector("#reconnect-note")?.setAttribute("hidden", "");
  document.querySelector<HTMLButtonElement>("#connect-twitch")!.hidden = true;
  document.querySelector<HTMLButtonElement>("#disconnect")!.hidden = false;
}

function disconnectTwitch(): void {
  deviceAbort?.abort();
  twitch.disconnect();
  sessionStorage.removeItem("stormchat_token");
  accessToken = "";
  state.simulator = true;
  updateConnectionStatus("Disconnected");
  setDashboardText("channel-name", "Simulator stream");
  setDashboardText(
    "connect-note",
    "Simulator is active. Connect Twitch to read your live chat, or run a demo below.",
  );
  document.querySelector<HTMLButtonElement>("#connect-twitch")!.hidden = false;
  document.querySelector<HTMLButtonElement>("#disconnect")!.hidden = true;
}

function copyOverlayUrl(): void {
  const url = makeOverlayUrl(
    location.origin,
    accessToken,
    twitchClientId(),
    state,
  );
  void navigator.clipboard?.writeText(url);
  document
    .querySelectorAll<HTMLButtonElement>("#copy-obs-url, #copy-obs-url-top")
    .forEach((button) => {
      const original = button.textContent || "";
      button.textContent = "Copied";
      window.setTimeout(() => (button.textContent = original), 1_400);
    });
}

function runScenario(scene: string): void {
  stopScenario();
  state.simulator = true;
  state.messages.length = 0;
  stopScenario = startScenario(scene, (messages) => {
    state.messages.push(...messages);
    tick();
  });
}

function clearChat(): void {
  state.messages.length = 0;
  state.events.length = 0;
  spells.clear();
  tick();
}

function handleTwitch(kind: string, data: any): void {
  if (kind === "chat") {
    const message: ChatMessage = {
      user: data.user,
      text: data.text,
      at: Date.now(),
      emotes: [],
    };
    state.messages.push(message);
    if (data.text.startsWith("!"))
      spells.cast(data.text.split(/\s/)[0].toLowerCase(), data.user);
    drawChat(state.messages);
    return;
  }

  const kindByEvent: Record<string, WeatherEvent["kind"]> = {
    follow: "follow",
    sub: "sub",
    cheer: "cheer",
    raid: "raid",
    tornado: "tornado",
  };
  const eventKind = kindByEvent[kind];
  if (!eventKind) return;
  showEvent({
    kind: eventKind,
    name: data.user,
    amount: data.amount,
    at: Date.now(),
  });
  if (kind === "raid") {
    for (let index = 0; index < Math.min(25, data.amount || 0); index += 1) {
      state.messages.push({
        user: data.user,
        text: "POG!!!",
        at: Date.now(),
        emotes: ["POG"],
      });
    }
  }
}

function showEvent(event: WeatherEvent): void {
  state.events.push(event);
  weatherCanvas.addEvent(event);
  const toast = document.querySelector<HTMLElement>("#event-toast");
  if (toast) {
    toast.textContent = eventLabel(event);
    toast.classList.add("visible");
    window.setTimeout(
      () => toast.classList.remove("visible"),
      EVENT_LAYOUT.toastHideMs,
    );
  }
  const chatText: Partial<Record<WeatherEvent["kind"], string>> = {
    follow: "💧 plip!",
    sub: "🌈 subbed!",
    cheer: `✦ ${event.amount} bits!`,
    raid: `⚠ ${event.amount || "A"} raiders incoming!`,
  };
  if (chatText[event.kind]) addMessage(event.name, chatText[event.kind]!);
}

function eventLabel(event: WeatherEvent): string {
  const labels: Record<WeatherEvent["kind"], string> = {
    raid: `⚠ STORM FRONT INCOMING · ${event.name}`,
    sub: `🌈 ${event.name} subscribed`,
    follow: `💧 plip · ${event.name} followed`,
    cheer: `✦ ${event.name} cheered ${event.amount || 0} bits`,
    tornado: `🌪 ${event.name} summoned a tornado`,
    lightning: `⚡ ${event.name} called lightning`,
  };
  return labels[event.kind];
}

function addMessage(user: string, text: string): void {
  state.messages.push({ user, text, at: Date.now(), emotes: [] });
  drawChat(state.messages);
}

function castWeather(weather: Weather): void {
  state.spellWeather = { weather, until: Date.now() + 20_000 };
  updateClimate();
}

function updateSpellProgress(): void {
  setDashboardText("vote-label", spellProgress.text || "No active spell vote");
  setDashboardText("hud-vote-progress", spellProgress.text);
  const fill = document.querySelector<HTMLElement>("#vote-fill");
  if (fill) fill.style.width = `${spellProgress.fill}%`;
  document
    .querySelector("#hud-vote-progress")
    ?.classList.toggle("visible", Boolean(spellProgress.text));
}

function tick(): void {
  state.climate = analyze(state.messages);
  if (state.demoWeather) {
    state.climate = withWeather(state.climate, state.demoWeather, true);
  } else if (state.spellWeather && state.spellWeather.until > Date.now()) {
    state.climate = withWeather(state.climate, state.spellWeather.weather);
  } else {
    state.spellWeather = undefined;
  }
  spells.refresh();

  if (state.climate.weather !== state.lastRecordedWeather) {
    if (state.climate.weather in state.weatherCounts) {
      state.weatherCounts[state.climate.weather] += 1;
    }
    state.lastRecordedWeather = state.climate.weather;
    for (const [weather, count] of Object.entries(state.weatherCounts)) {
      setDashboardText(`${weather}-count`, String(count));
    }
  }
  updateClimate();
  drawMetrics(state.climate);
  drawChat(state.messages);
}

function updateClimate(): void {
  if (!weatherCanvas) return;
  weatherCanvas.setWeather(state.climate.weather, state.sensitivity);
  weatherCanvas.setCalm(state.calm);
  setDashboardText("main-icon", icons[state.climate.weather]);
  setDashboardText("main-label", state.climate.label);
  setDashboardText("forecast", state.climate.forecast);
  setDashboardText("top-emote", state.climate.topEmote);
  setDashboardText("top-emote-copy", state.climate.topEmote);
  updateOverlay(state.climate, spellProgress.text);
  document.body.dataset.weather = state.climate.weather;
}

function weatherLabel(weather: Weather): string {
  const labels: Record<Weather, string> = {
    sun: "Sunshine",
    storm: "Thunderstorm",
    breeze: "Calm breeze",
    rain: "Drizzle",
    fog: "Quiet skies",
    snow: "Emote flurry",
  };
  return labels[weather];
}
