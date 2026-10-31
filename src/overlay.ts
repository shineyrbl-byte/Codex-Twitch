import type { Climate, Weather } from "./types";

const icons: Record<Weather, string> = {
  sun: "☀️",
  storm: "⛈️",
  breeze: "🌤️",
  rain: "🌧️",
  fog: "🌫️",
  snow: "❄️",
};

export function renderOverlay(
  root: HTMLElement,
  climate: Climate,
): HTMLCanvasElement {
  root.innerHTML = `<main class="overlay"><canvas id="weather"></canvas><div class="overlay-hud"><div class="hud-icon" id="hud-icon">${icons[climate.weather]}</div><div><div class="hud-label" id="hud-label">${climate.label}</div><div class="hud-forecast" id="hud-forecast">${climate.forecast}</div><div class="hud-vote" id="hud-vote-progress"></div></div><div class="hud-emote"><small>CHAT'S MOOD</small><strong id="hud-emote">${climate.topEmote}</strong></div></div><div id="event-toast" class="event-toast"></div></main>`;
  return document.querySelector<HTMLCanvasElement>("#weather")!;
}

export function updateOverlay(climate: Climate, voteText: string): void {
  setText("hud-icon", icons[climate.weather]);
  setText("hud-label", climate.label);
  setText("hud-forecast", climate.forecast);
  setText("hud-emote", climate.topEmote);
  setText("hud-vote-progress", voteText);
  document
    .querySelector("#hud-vote-progress")
    ?.classList.toggle("visible", Boolean(voteText));
}

function setText(id: string, value: string): void {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}
