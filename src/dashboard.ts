import type { ChatMessage, Climate, Weather, WeatherEvent } from "./types";

const icons: Record<Weather, string> = {
  sun: "☀️",
  storm: "⛈️",
  breeze: "🌤️",
  rain: "🌧️",
  fog: "🌫️",
  snow: "❄️",
};

export interface DashboardHandlers {
  onSimulator: (scene: string) => void;
  onEvent: (kind: WeatherEvent["kind"]) => void;
  onSpell: (spell: string, user: string) => void;
  onIntensity: (value: number) => void;
  onThreshold: (value: number) => void;
  onCalm: () => boolean;
  onLightning: () => void;
  onClear: () => void;
  onCopyOverlay: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function renderDashboard(
  root: HTMLElement,
  climate: Climate,
  sensitivity: number,
  thresholdPercent: number,
): void {
  root.innerHTML = `<div class="app-shell"><header class="topbar"><a class="brand" href="/"><span class="brand-mark">S</span><span>stormchat<span class="brand-period">.</span></span></a><div class="top-status"><span class="status-dot" id="status-dot"></span><span id="connection-status">Simulator ready</span></div><div class="top-actions"><a class="ghost-button" href="/overlay#sim=1" target="_blank">↗&nbsp; Preview overlay</a><button class="icon-button" id="copy-obs-url-top" title="Copy OBS overlay URL">⌁</button></div></header>
<main class="dashboard"><section class="intro"><div class="eyebrow"><span class="live-pulse"></span> LIVE CHAT CLIMATE</div><h1>Chat is the <span>weather.</span></h1><p>Your community sets the forecast. Bring the mood of chat right into your stream.</p></section>
<section class="hero-grid"><article class="weather-card" id="weather-card"><div class="card-topline"><span class="micro-label">CURRENT CONDITIONS</span><span class="live-badge"><i></i> LIVE</span></div><div class="weather-hero"><canvas id="weather" class="preview-canvas"></canvas><div class="weather-symbol" id="main-icon">${icons[climate.weather]}</div><div class="weather-info"><div class="weather-name" id="main-label">${climate.label}</div><div class="forecast" id="forecast">${climate.forecast}</div></div><div class="condition-time">YOUR SCENE<br/><strong>LIVE NOW</strong></div></div><div class="weather-footer"><div class="contributor"><div class="contributor-mark" id="top-emote">${climate.topEmote}</div><div><small>TOP CONTRIBUTOR</small><strong id="top-emote-copy">${climate.topEmote}</strong></div></div><div class="weather-actions"><button class="soft-button" id="test-lightning">⚡&nbsp; Test lightning</button><button class="soft-button" id="calm-toggle">Ⅱ&nbsp; Calm skies</button></div></div></article>
<aside class="side-panel"><div class="side-head"><div><span class="micro-label">YOUR CHANNEL</span><h2 id="channel-name">Simulator stream</h2></div><span class="channel-avatar">S</span></div><div class="connection-note" id="connect-note">Simulator is active. Connect Twitch to read your live chat, or run a demo below.</div><div class="reconnect-note" id="reconnect-note" hidden>⚠ Twitch connection expired. Reconnect to refresh the OBS overlay link.</div><div class="connect-actions"><button class="twitch-button" id="connect-twitch"><span>◉</span> Connect with Twitch</button><button class="text-button" id="disconnect" hidden>Disconnect</button></div><button class="copy-obs-button" id="copy-obs-url">Copy OBS overlay URL</button><div class="private-warning">The link contains your Twitch access token. Keep it private and remove it from OBS when disconnecting.</div><div class="divider"></div><div class="stream-row"><span class="stream-led"></span><span>Simulator mode</span><span class="streaming-pill">ON</span></div><div class="tiny-copy">Demo messages stay in this browser and disappear when you refresh.</div></aside></section>
<section class="section-heading"><div><span class="micro-label">THE LAST 30 SECONDS</span><h2>Climate at a glance</h2></div><div class="window-label"><span></span> Updating every 2 seconds</div></section>
<section class="metrics" id="metrics"></section>
<section class="lower-grid"><article class="simulator-panel"><div class="panel-title"><div><span class="micro-label">TRY IT OUT</span><h2>Set the scene</h2></div><span class="demo-tag">DEMO MODE</span></div><p>Pick a chat moment and watch the climate shift in real time.</p><div class="scenario-grid"><button class="scenario" data-sim="hype"><span class="scenario-icon sun-bg">☀️</span><span><strong>Hype train</strong><small>Sunshine incoming</small></span><b>→</b></button><button class="scenario" data-sim="chaos"><span class="scenario-icon storm-bg">⛈️</span><span><strong>Emote storm</strong><small>Things get chaotic</small></span><b>→</b></button><button class="scenario" data-sim="quiet"><span class="scenario-icon fog-bg">🌫️</span><span><strong>Chat goes quiet</strong><small>Fog rolls in</small></span><b>→</b></button><button class="scenario" data-sim="negative"><span class="scenario-icon rain-bg">🌧️</span><span><strong>Rainy day</strong><small>A little negativity</small></span><b>→</b></button></div><div class="event-tests"><span>TRIGGER AN EVENT</span><button data-event="follow">💧 Follow</button><button data-event="sub">🌈 Sub</button><button data-event="cheer">✦ Cheer</button><button data-event="raid">⚠ Raid</button><button data-event="tornado">🌪 Tornado</button></div><div class="sim-bottom"><div class="slider-copy"><span>Effect intensity</span><strong id="intensity-value">${sensitivity}%</strong></div><input type="range" min="10" max="100" value="${sensitivity}" id="intensity"/><div class="slider-caps"><span>SUBTLE</span><span>DRAMATIC</span></div></div></article>
<article class="activity-panel"><div class="panel-title"><div><span class="micro-label">THE CHATTER</span><h2>Weather makers</h2></div><button class="clear-button" id="clear-chat">Clear</button></div><div class="chat-list" id="chat-list"></div><div class="spells-box"><div><span class="micro-label">CHAT SPELLS</span><p>Votes scale with the number of active chatters (last minute).</p></div><div class="spell-row"><button data-spell="!rain">🌧 !rain</button><button data-spell="!sun">☀️ !sun</button><button data-spell="!snow">❄️ !snow</button><button data-spell="!fog">🌫 !fog</button></div><div class="vote-track"><div id="vote-fill"></div></div><div class="vote-label" id="vote-label">No active spell vote</div><label class="threshold-setting">Active chatters needed <strong id="spell-threshold-value">${thresholdPercent}%</strong><input type="range" id="spell-threshold" min="10" max="70" step="5" value="${thresholdPercent}"></label></div></article></section>
<section class="bottom-row"><div class="how-card"><span class="how-icon">✳</span><div><strong>Simple, explainable, yours.</strong><p>No AI guesses. Just chat activity, known emotes, and word lists make the forecast.</p></div><a href="#how-it-works">How it works&nbsp; ↗</a></div><div class="climate-card"><span class="micro-label">TODAY'S CLIMATE</span><div class="climate-minis"><span>☀️ <b id="sun-count">0</b></span><span>⛈️ <b id="storm-count">0</b></span><span>🌧️ <b id="rain-count">0</b></span><span>🌫️ <b id="fog-count">0</b></span></div></div></section>
<footer><span>STORMCHAT <b>⛈</b> &nbsp;—&nbsp; THE WEATHER IS THE CHAT</span><a href="https://github.com/shineyrbl-byte/Codex-Twitch" target="_blank">GITHUB ↗</a></footer></main></div>`;
}

export function bindDashboard(handlers: DashboardHandlers): void {
  document
    .querySelectorAll<HTMLButtonElement>("[data-sim]")
    .forEach((button) => {
      button.onclick = () =>
        handlers.onSimulator(button.dataset.sim || "quiet");
    });
  document
    .querySelectorAll<HTMLButtonElement>("[data-event]")
    .forEach((button) => {
      button.onclick = () =>
        handlers.onEvent(button.dataset.event as WeatherEvent["kind"]);
    });
  document
    .querySelectorAll<HTMLButtonElement>("[data-spell]")
    .forEach((button) => {
      button.onclick = () =>
        handlers.onSpell(
          button.dataset.spell || "",
          `viewer${Math.ceil(Math.random() * 7)}`,
        );
    });
  document.querySelector<HTMLInputElement>("#intensity")!.oninput = (event) =>
    handlers.onIntensity(Number((event.target as HTMLInputElement).value));
  document.querySelector<HTMLInputElement>("#spell-threshold")!.oninput = (
    event,
  ) => handlers.onThreshold(Number((event.target as HTMLInputElement).value));
  document.querySelector<HTMLButtonElement>("#calm-toggle")!.onclick = (
    event,
  ) => {
    const isCalm = handlers.onCalm();
    (event.currentTarget as HTMLButtonElement).textContent = isCalm
      ? "▶ Resume skies"
      : "Ⅱ  Calm skies";
    document
      .querySelector("#weather-card")!
      .classList.toggle("is-calm", isCalm);
  };
  document.querySelector<HTMLButtonElement>("#test-lightning")!.onclick =
    handlers.onLightning;
  document.querySelector<HTMLButtonElement>("#clear-chat")!.onclick =
    handlers.onClear;
  document.querySelector<HTMLButtonElement>("#copy-obs-url")!.onclick =
    handlers.onCopyOverlay;
  document.querySelector<HTMLButtonElement>("#copy-obs-url-top")!.onclick =
    handlers.onCopyOverlay;
  document.querySelector<HTMLButtonElement>("#connect-twitch")!.onclick =
    handlers.onConnect;
  document.querySelector<HTMLButtonElement>("#disconnect")!.onclick =
    handlers.onDisconnect;
}

export function drawMetrics(climate: Climate): void {
  const element = document.querySelector("#metrics");
  if (!element) return;
  const rows = [
    ["Energy", "The room is warming up", "sun", climate.energy, "↗"],
    ["Positivity", "Good vibes in the air", "heart", climate.positivity, "✳"],
    ["Chaos", "A little wild out there", "chaos", climate.chaos, "⌁"],
    ["Quiet", "Stillness level", "quiet", climate.quiet, "◌"],
  ];
  element.innerHTML = rows
    .map(
      ([name, description, key, value, icon]) =>
        `<article class="metric-card"><div class="metric-head"><span class="metric-icon ${key}">${icon}</span><span class="micro-label">${name}</span><span class="metric-value">${value}%</span></div><div class="metric-bar"><i class="${key}" style="width:${value}%"></i></div><small>${description}</small></article>`,
    )
    .join("");
}

export function drawChat(messages: ChatMessage[]): void {
  const box = document.querySelector("#chat-list");
  if (!box) return;
  const recent = messages.slice(-5).reverse();
  box.innerHTML = recent.length
    ? recent
        .map(
          (message, index) =>
            `<div class="chat-line"><span class="chat-avatar avatar-${index % 4}">${escapeHtml(message.user.slice(0, 1).toUpperCase())}</span><span class="chat-user">${escapeHtml(message.user)}</span><span class="chat-text">${escapeHtml(message.text)}</span><time>${String(Math.floor((Date.now() - message.at) / 60_000)).padStart(2, "0")}:${String(Math.floor((Date.now() - message.at) / 1000) % 60).padStart(2, "0")}</time></div>`,
        )
        .join("")
    : '<div class="empty-chat"><span>☁️</span><p>Chat is calm.<br/>Pick a scene to stir things up.</p></div>';
}

export function setDashboardText(id: string, value: string): void {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[char];
  });
}
