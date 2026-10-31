import { analyze } from "./mood";
import type { ChatMessage, Climate, Weather, WeatherEvent } from "./types";

export interface OverlayOptions {
  simulator: boolean;
  token: string;
  clientId: string;
  sensitivity: number;
  spellThresholdPercent: number;
  demo: string;
}

export interface AppState {
  messages: ChatMessage[];
  climate: Climate;
  events: WeatherEvent[];
  calm: boolean;
  sensitivity: number;
  simulator: boolean;
  spellThresholdPercent: number;
  spellWeather?: { weather: Weather; until: number };
  demoWeather?: Weather;
  lastRecordedWeather: Weather;
  weatherCounts: Record<string, number>;
}

export function createState(thresholdPercent = 30): AppState {
  return {
    messages: [],
    climate: analyze([]),
    events: [],
    calm: false,
    sensitivity: 50,
    simulator: true,
    spellThresholdPercent: thresholdPercent,
    lastRecordedWeather: "fog",
    weatherCounts: { sun: 0, storm: 0, rain: 0, fog: 0 },
  };
}

export function readOverlayOptions(hash: string): OverlayOptions {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const sensitivity = Number(params.get("sensitivity"));
  const spellThresholdPercent = Number(params.get("spell_threshold"));

  return {
    simulator: params.get("sim") === "1",
    demo: params.get("demo") || "",
    token: params.get("token") || "",
    clientId: params.get("client_id") || "",
    sensitivity:
      Number.isFinite(sensitivity) && sensitivity > 0
        ? Math.max(10, Math.min(100, sensitivity))
        : 50,
    spellThresholdPercent:
      Number.isFinite(spellThresholdPercent) && spellThresholdPercent > 0
        ? Math.max(10, Math.min(70, spellThresholdPercent))
        : 30,
  };
}

export function makeOverlayUrl(
  origin: string,
  token: string,
  clientId: string,
  state: AppState,
): string {
  const url = new URL("/overlay", origin);
  const fragment = new URLSearchParams();
  if (token && clientId) {
    fragment.set("token", token);
    fragment.set("client_id", clientId);
  } else {
    fragment.set("sim", "1");
  }
  fragment.set("sensitivity", String(state.sensitivity));
  fragment.set("spell_threshold", String(state.spellThresholdPercent));
  url.hash = fragment.toString();
  return url.toString();
}
