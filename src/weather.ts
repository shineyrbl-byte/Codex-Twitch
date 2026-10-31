import type { Weather, WeatherEvent } from "./types";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  phase: number;
};
const colors: Record<Weather, string> = {
  sun: "#f4b45f",
  storm: "#9d91ff",
  breeze: "#91dbc8",
  rain: "#82b9ed",
  fog: "#c5cede",
  snow: "#e2f1ff",
};
export class WeatherCanvas {
  private ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private dpr = 1;
  private particles: Particle[] = [];
  private raf = 0;
  private last = 0;
  private flashes = 0;
  private weather: Weather = "breeze";
  private intensity = 45;
  private calm = false;
  private events: WeatherEvent[] = [];
  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) throw new Error("Canvas unavailable");
    this.ctx = ctx;
    this.resize();
    window.addEventListener("resize", this.resize);
    this.raf = requestAnimationFrame(this.frame);
  }
  setWeather(weather: Weather, intensity: number) {
    this.weather = weather;
    this.intensity = intensity;
  }
  setCalm(value: boolean) {
    this.calm = value;
  }
  addEvent(event: WeatherEvent) {
    this.events.push(event);
    if (event.kind === "lightning" || event.kind === "raid") this.flashes = 1;
  }
  destroy() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.resize);
  }
  private resize = () => {
    const b = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = b.width;
    this.height = b.height;
    this.canvas.width = Math.round(b.width * this.dpr);
    this.canvas.height = Math.round(b.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.particles = [];
  };
  private frame = (t: number) => {
    const dt = Math.min((t - this.last) / 1000 || 0, 0.05);
    this.last = t;
    this.draw(t / 1000, dt);
    this.raf = requestAnimationFrame(this.frame);
  };
  private draw(time: number, dt: number) {
    const c = this.ctx,
      w = this.width,
      h = this.height;
    c.clearRect(0, 0, w, h);
    if (this.calm) {
      this.drawLabels(time);
      return;
    }
    const count = Math.round(24 + this.intensity * 0.75);
    while (this.particles.length < count)
      this.particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: 0,
        vy: 0,
        size: 1,
        alpha: 0.5,
        phase: Math.random() * 7,
      });
    if (this.particles.length > count) this.particles.length = count;
    if (this.weather === "sun") {
      const g = c.createRadialGradient(
        w * 0.12,
        h * 0.1,
        10,
        w * 0.12,
        h * 0.1,
        Math.max(w, h) * 0.9,
      );
      g.addColorStop(0, "rgba(255,196,91,.18)");
      g.addColorStop(0.55, "rgba(255,204,123,.045)");
      g.addColorStop(1, "rgba(255,204,123,0)");
      c.fillStyle = g;
      c.fillRect(0, 0, w, h);
    }
    if (this.weather === "fog") {
      for (let i = 0; i < 4; i++) {
        const x = ((time * 9 + i * w * 0.31) % (w * 1.5)) - w * 0.25;
        const g = c.createRadialGradient(
          x,
          h * (0.7 + i * 0.08),
          0,
          x,
          h * (0.7 + i * 0.08),
          w * 0.48,
        );
        g.addColorStop(0, `rgba(188,201,222,${0.05 + i * 0.012})`);
        g.addColorStop(1, "rgba(188,201,222,0)");
        c.fillStyle = g;
        c.fillRect(0, h * 0.45, w, h * 0.55);
      }
    }
    if (this.weather === "storm" && Math.random() < dt * 0.28)
      this.flashes = Math.max(this.flashes, 0.16 + Math.random() * 0.14);
    for (const p of this.particles) {
      p.phase += dt;
      const x = p.x / w,
        y = p.y / h;
      let color = colors[this.weather];
      if (this.weather === "rain" || this.weather === "storm") {
        p.vx = this.weather === "storm" ? -w * 0.12 : -w * 0.035;
        p.vy = h * (1.2 + this.intensity / 100);
        p.size = 1 + Math.random() * 0.65;
        p.alpha = 0.23 + Math.random() * 0.35;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        c.strokeStyle = `rgba(174,207,255,${p.alpha})`;
        c.lineWidth = p.size;
        c.beginPath();
        c.moveTo(p.x, p.y);
        c.lineTo(p.x + p.vx * 0.015, p.y + h * 0.025);
        c.stroke();
      } else if (this.weather === "snow") {
        p.vx = Math.sin(p.phase * 1.5) * w * 0.025;
        p.vy = h * 0.09;
        p.size = 1.2 + Math.random() * 2;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        c.fillStyle = `rgba(226,241,255,${0.32 + Math.sin(p.phase) * 0.2})`;
        c.beginPath();
        c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        c.fill();
      } else {
        p.vx = Math.sin(p.phase) * w * 0.022;
        p.vy = -h * 0.055;
        p.size = 1.3 + Math.random() * 2.4;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.alpha = 0.35 + Math.sin(p.phase) * 0.18;
        c.fillStyle =
          color +
          Math.round(p.alpha * 255)
            .toString(16)
            .padStart(2, "0");
        c.beginPath();
        c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        c.fill();
      }
      if (p.y > h + 20 || p.y < -25 || p.x < -20 || p.x > w + 20) {
        p.x = Math.random() * w;
        p.y = this.weather === "snow" ? h + 10 : -10;
      }
    }
    if (this.flashes > 0) {
      c.fillStyle = `rgba(208,218,255,${this.flashes * 0.7})`;
      c.fillRect(0, 0, w, h);
      this.flashes = Math.max(0, this.flashes - dt * 2.4);
    }
    this.drawLabels(time);
  }
  private drawLabels(time: number) {
    const c = this.ctx,
      w = this.width,
      h = this.height;
    this.events = this.events.filter((e) => Date.now() - e.at < 4200);
    for (const e of this.events) {
      const age = (Date.now() - e.at) / 1000;
      const progress = age / 4.2;
      c.globalAlpha = Math.max(0, 1 - progress);
      if (e.kind === "sub") {
        const x = w * 0.5,
          y = h * 0.76,
          r = Math.min(w * 0.23, h * 0.47) * (0.75 + progress * 0.25);
        const rainbow = [
          "#fa7774",
          "#ffc66c",
          "#f3ec91",
          "#8fe0b5",
          "#7eb8ff",
          "#c09aff",
        ];
        rainbow.forEach((color, i) => {
          c.beginPath();
          c.strokeStyle = color;
          c.lineWidth = Math.max(4, w * 0.005);
          c.globalAlpha *= 0.6;
          c.arc(x, y, r - i * Math.max(4, w * 0.006), Math.PI, Math.PI * 2);
          c.stroke();
          c.globalAlpha = Math.max(0, 1 - progress);
        });
      }
      if (e.kind === "cheer") {
        const gems = Math.min(
          50,
          Math.max(8, Math.round(Math.log2((e.amount || 1) + 1) * 4)),
        );
        for (let i = 0; i < gems; i++) {
          const seed = (i * 47 + Math.floor(e.at / 1000)) % 101;
          const x = (seed / 100) * w;
          const y = ((age * 180 + i * 71) % (h + 90)) - 45;
          c.save();
          c.translate(x, y);
          c.rotate(age * 2 + i);
          c.fillStyle = i % 2 ? "#9fe6ff" : "#ffe68b";
          c.beginPath();
          c.moveTo(0, -5);
          c.lineTo(4, 0);
          c.lineTo(0, 5);
          c.lineTo(-4, 0);
          c.closePath();
          c.fill();
          c.restore();
        }
      }
      if (e.kind === "tornado") {
        const x = w * (0.18 + progress * 0.64),
          cy = h * 0.57;
        for (let i = 0; i < 9; i++) {
          const q = i / 9,
            rx = (0.018 + q * 0.07) * w,
            ry = (0.014 + q * 0.025) * h;
          c.beginPath();
          c.ellipse(x, cy + (q - 0.5) * h * 0.27, rx, ry, 0, 0, Math.PI * 2);
          c.strokeStyle = `rgba(204,222,235,${0.45 * (1 - progress)})`;
          c.lineWidth = 2;
          c.stroke();
        }
        c.beginPath();
        c.moveTo(x, cy - h * 0.12);
        c.lineTo(x, cy + h * 0.18);
        c.strokeStyle = "rgba(220,231,243,.6)";
        c.lineWidth = 2;
        c.stroke();
      }
      if (e.kind === "follow") {
        const x = w * (0.25 + ((e.at % 1000) / 1000) * 0.5),
          y = h * (0.23 + progress * 0.35);
        c.beginPath();
        c.fillStyle = "#b9dcff";
        c.ellipse(x, y, 5, 8, 0, 0, Math.PI * 2);
        c.fill();
        c.beginPath();
        c.moveTo(x, y + 9);
        c.lineTo(x - 4, y + 13);
        c.lineTo(x + 4, y + 13);
        c.fill();
      }
      const x = w * 0.5 + Math.sin(age * 1.3) * w * 0.24,
        y = h * 0.32 - age * h * 0.035;
      c.globalAlpha = Math.max(0, 1 - progress);
      c.textAlign = "center";
      c.font = `600 ${Math.max(17, w * 0.018)}px Inter,system-ui,sans-serif`;
      c.fillStyle = "#fff";
      c.shadowColor = "rgba(0,0,0,.8)";
      c.shadowBlur = 12;
      const label =
        e.kind === "raid"
          ? `⚠ STORM FRONT INCOMING · ${e.name}`
          : e.kind === "follow"
            ? `💧 plip · ${e.name} followed`
            : e.kind === "sub"
              ? `🌈 ${e.name} subscribed`
              : e.kind === "cheer"
                ? `✦ ${e.name} cheered ${e.amount || 0} bits`
                : e.kind === "tornado"
                  ? `🌪 ${e.name} summoned a tornado`
                  : `⚡ ${e.name} called lightning`;
      c.fillText(label, x, y);
      c.shadowBlur = 0;
    }
    c.globalAlpha = 1;
    c.textAlign = "start";
  }
}
