import type { ChatMessage, Weather } from "./types";

export interface SpellProgress {
  weather?: Weather;
  count: number;
  required: number;
  text: string;
  fill: number;
}

const spellWeather: Record<string, Weather> = {
  rain: "rain",
  sun: "sun",
  snow: "snow",
  fog: "fog",
};

export class SpellController {
  private votes = new Map<string, { weather: Weather; at: number }>();
  private chatterCooldowns = new Map<string, number>();
  private lightningCooldowns = new Map<string, number>();

  constructor(
    private getMessages: () => ChatMessage[],
    private getThresholdPercent: () => number,
    private onProgress: (progress: SpellProgress) => void,
    private onCast: (weather: Weather) => void,
    private onLightning: (user: string) => void,
  ) {}

  cast(command: string, user: string): void {
    const name = user.toLowerCase();
    const weather = spellWeather[command.replace(/^!/, "").toLowerCase()];
    const now = Date.now();
    if (command.toLowerCase() === "!lightning") {
      if (now - (this.lightningCooldowns.get(name) || 0) >= 60_000) {
        this.lightningCooldowns.set(name, now);
        this.onLightning(user);
      }
      return;
    }
    if (!weather || now - (this.chatterCooldowns.get(name) || 0) < 20_000)
      return;

    this.chatterCooldowns.set(name, now);
    this.votes.set(name, { weather, at: now });
    this.refresh();
  }

  clear(): void {
    this.votes.clear();
    this.refresh();
  }

  refresh(): void {
    const now = Date.now();
    this.votes.forEach((vote, user) => {
      if (now - vote.at > 20_000) this.votes.delete(user);
    });

    const counts = new Map<Weather, number>();
    this.votes.forEach(({ weather }) =>
      counts.set(weather, (counts.get(weather) || 0) + 1),
    );
    const winner = [...counts].sort((a, b) => b[1] - a[1])[0];
    const required = this.requiredVotes(now);
    if (!winner) {
      this.onProgress({ count: 0, required, text: "", fill: 0 });
      return;
    }

    const [weather, count] = winner;
    const label = weather[0].toUpperCase() + weather.slice(1);
    const text = `${this.icon(weather)} ${label}: ${count}/${required}`;
    this.onProgress({
      weather,
      count,
      required,
      text,
      fill: Math.min(100, (count / required) * 100),
    });
    if (count >= required) {
      this.votes.clear();
      this.onCast(weather);
      this.onProgress({ count: 0, required, text: "", fill: 0 });
    }
  }

  private requiredVotes(now: number): number {
    const chatters = new Set(
      this.getMessages()
        .filter((message) => now - message.at <= 60_000)
        .map((message) => message.user.toLowerCase()),
    );
    this.votes.forEach((vote, user) => {
      if (now - vote.at <= 20_000) chatters.add(user);
    });
    const percent = Math.max(10, Math.min(70, this.getThresholdPercent()));
    return Math.max(2, Math.min(5, Math.ceil((chatters.size * percent) / 100)));
  }

  private icon(weather: Weather): string {
    return {
      sun: "☀️",
      storm: "⛈️",
      breeze: "🌤️",
      rain: "🌧️",
      fog: "🌫️",
      snow: "❄️",
    }[weather];
  }
}
