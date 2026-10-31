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

type LightningBolt = {
  points: Array<{ x: number; y: number }>;
  branches: Array<Array<{ x: number; y: number }>>;
  startedAt: number;
};

const colors: Record<Weather, string> = {
  sun: "#f4b45f",
  storm: "#9d91ff",
  breeze: "#91dbc8",
  rain: "#82b9ed",
  fog: "#c5cede",
  snow: "#e2f1ff",
};

const clamp = (value: number, min = 0, max = 1) =>
  Math.max(min, Math.min(max, value));
const MAX_PARTICLES: Record<Weather, number> = {
  storm: 600,
  rain: 240,
  snow: 180,
  sun: 100,
  breeze: 90,
  fog: 0,
};

export class WeatherCanvas {
  private ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private dpr = 1;
  private particlePools = new Map<Weather, Particle[]>();
  private raf = 0;
  private last = 0;
  private flash = 0;
  private weather: Weather = "breeze";
  private previousWeather: Weather = "breeze";
  private transitionStartedAt = 0;
  private readonly transitionDuration = 1_300;
  private intensity = 45;
  private calm = false;
  private events: WeatherEvent[] = [];
  private nextLightningAt = 0;
  private bolt?: LightningBolt;

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) throw new Error("Canvas unavailable");
    this.ctx = ctx;
    this.resize();
    window.addEventListener("resize", this.resize);
    this.raf = requestAnimationFrame(this.frame);
  }

  setWeather(weather: Weather, intensity: number) {
    const nextIntensity = clamp(intensity / 100, 0.1, 1) * 100;
    if (weather !== this.weather) {
      this.previousWeather = this.weather;
      this.weather = weather;
      this.transitionStartedAt = performance.now();
      if (weather === "storm")
        this.nextLightningAt = performance.now() / 1000 + 4;
    }
    this.intensity = nextIntensity;
  }

  setCalm(value: boolean) {
    this.calm = value;
  }

  addEvent(event: WeatherEvent) {
    this.events.push(event);
    if (event.kind === "lightning")
      this.triggerLightning(performance.now() / 1000);
    if (event.kind === "raid") this.flash = Math.max(this.flash, 0.18);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.resize);
  }

  private resize = () => {
    const bounds = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = bounds.width;
    this.height = bounds.height;
    this.canvas.width = Math.round(bounds.width * this.dpr);
    this.canvas.height = Math.round(bounds.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.particlePools.clear();
  };

  private frame = (timestamp: number) => {
    const dt = Math.min((timestamp - this.last) / 1000 || 0, 0.05);
    this.last = timestamp;
    this.draw(timestamp, dt);
    this.raf = requestAnimationFrame(this.frame);
  };

  private draw(timestamp: number, dt: number) {
    const context = this.ctx;
    const width = this.width;
    const height = this.height;
    const time = timestamp / 1000;
    context.clearRect(0, 0, width, height);

    if (!this.calm) {
      const blend = clamp(
        (timestamp - this.transitionStartedAt) / this.transitionDuration,
      );
      if (blend < 1)
        this.drawWeather(this.previousWeather, 1 - blend, time, dt);
      this.drawWeather(this.weather, blend, time, dt);
      if (this.weather === "storm" && time >= this.nextLightningAt) {
        this.triggerLightning(time);
        const power = this.intensity / 100;
        this.nextLightningAt = time + 8 - power * 4 + Math.random() * 4;
      }
    }
    // A direct !lightning command still strikes when weather effects are calmed.
    this.drawLightning(time, dt);
    this.drawEvents();
  }

  private drawWeather(
    weather: Weather,
    opacity: number,
    time: number,
    dt: number,
  ) {
    if (opacity <= 0) return;
    const context = this.ctx;
    const width = this.width;
    const height = this.height;
    const power = this.intensity / 100;
    context.save();
    context.globalAlpha = opacity;

    if (weather === "storm") this.drawStormTint();
    if (weather === "sun") this.drawSunlight(time);
    if (weather === "fog") this.drawFog(time);

    const count = this.particleCount(weather, power);
    const particles = this.pool(weather, count);
    for (let index = 0; index < count; index += 1) {
      const particle = particles[index];
      particle.phase += dt;
      const centerDim = this.centerOpacity(particle.x);

      if (weather === "storm" || weather === "rain") {
        particle.vx = weather === "storm" ? -width * 0.34 : -width * 0.045;
        particle.vy = height * (weather === "storm" ? 0.95 : 0.68);
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        const alpha = (weather === "storm" ? 0.42 : 0.26) * centerDim;
        context.strokeStyle = `rgba(174,207,255,${alpha})`;
        context.lineWidth = weather === "storm" ? 1.1 + power * 0.65 : 1;
        context.beginPath();
        context.moveTo(particle.x, particle.y);
        context.lineTo(
          particle.x + particle.vx * 0.028,
          particle.y + height * (weather === "storm" ? 0.035 : 0.02),
        );
        context.stroke();
      } else if (weather === "snow") {
        particle.vx =
          Math.sin(particle.phase * 0.7 + particle.phase) * width * 0.018;
        particle.vy = height * 0.045;
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        context.fillStyle = `rgba(226,241,255,${(0.42 + Math.sin(particle.phase) * 0.16) * centerDim})`;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        context.fill();
      } else if (weather === "breeze" || weather === "sun") {
        particle.vx = Math.sin(particle.phase * 0.8) * width * 0.018;
        particle.vy = -height * (weather === "sun" ? 0.035 : 0.05);
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        const alpha = (weather === "sun" ? 0.42 : 0.32) * centerDim;
        context.fillStyle = `${colors[weather]}${Math.round(alpha * 255)
          .toString(16)
          .padStart(2, "0")}`;
        context.beginPath();
        context.ellipse(
          particle.x,
          particle.y,
          particle.size * 1.7,
          particle.size,
          particle.phase,
          0,
          Math.PI * 2,
        );
        context.fill();
      }

      if (this.outOfBounds(particle, weather))
        this.resetParticle(particle, weather);
    }
    context.restore();
  }

  private particleCount(weather: Weather, power: number): number {
    switch (weather) {
      case "storm":
        return Math.min(MAX_PARTICLES.storm, Math.round(180 + power * 420));
      case "rain":
        return Math.min(MAX_PARTICLES.rain, Math.round(75 + power * 165));
      case "snow":
        return Math.min(MAX_PARTICLES.snow, Math.round(40 + power * 140));
      case "sun":
        return Math.min(MAX_PARTICLES.sun, Math.round(28 + power * 72));
      case "breeze":
        return Math.min(MAX_PARTICLES.breeze, Math.round(18 + power * 62));
      case "fog":
        return 0;
    }
  }

  private pool(weather: Weather, count: number): Particle[] {
    let particles = this.particlePools.get(weather);
    if (!particles) {
      particles = [];
      this.particlePools.set(weather, particles);
    }
    while (particles.length < Math.min(count, MAX_PARTICLES[weather])) {
      particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: 0,
        vy: 0,
        size: 1 + Math.random() * 2,
        alpha: 0.5,
        phase: Math.random() * Math.PI * 2,
      });
    }
    return particles;
  }

  private outOfBounds(particle: Particle, weather: Weather): boolean {
    if (weather === "snow") return particle.y > this.height + 12;
    if (weather === "storm" || weather === "rain") {
      return particle.y > this.height + 30 || particle.x < -40;
    }
    return particle.y < -20 || particle.x < -20 || particle.x > this.width + 20;
  }

  private resetParticle(particle: Particle, weather: Weather) {
    if (weather === "snow") {
      particle.x = Math.random() * this.width;
      particle.y = -10;
    } else if (weather === "storm" || weather === "rain") {
      particle.x = Math.random() * this.width + this.width * 0.1;
      particle.y = -20 - Math.random() * this.height * 0.2;
    } else {
      particle.x = Math.random() * this.width;
      particle.y = this.height + 10;
    }
  }

  private centerOpacity(x: number): number {
    return x > this.width / 3 && x < (this.width * 2) / 3 ? 0.38 : 1;
  }

  private drawStormTint() {
    const context = this.ctx;
    const top = context.createLinearGradient(0, 0, 0, this.height * 0.42);
    top.addColorStop(0, "rgba(13,17,30,0.25)");
    top.addColorStop(1, "rgba(13,17,30,0)");
    context.fillStyle = top;
    context.fillRect(0, 0, this.width, this.height * 0.42);

    const edges = context.createLinearGradient(0, 0, this.width, 0);
    edges.addColorStop(0, "rgba(13,17,30,0.16)");
    edges.addColorStop(0.18, "rgba(13,17,30,0)");
    edges.addColorStop(0.82, "rgba(13,17,30,0)");
    edges.addColorStop(1, "rgba(13,17,30,0.16)");
    context.fillStyle = edges;
    context.fillRect(0, 0, this.width, this.height);
  }

  private drawSunlight(time: number) {
    const context = this.ctx;
    const x = this.width * 0.1;
    const y = this.height * 0.06;
    const glow = context.createRadialGradient(
      x,
      y,
      8,
      x,
      y,
      Math.max(this.width, this.height) * 0.92,
    );
    glow.addColorStop(0, "rgba(255,196,91,0.32)");
    glow.addColorStop(0.35, "rgba(255,204,123,0.11)");
    glow.addColorStop(1, "rgba(255,204,123,0)");
    context.fillStyle = glow;
    context.fillRect(0, 0, this.width, this.height);

    context.save();
    context.lineCap = "round";
    for (let ray = 0; ray < 13; ray += 1) {
      const angle = -0.25 + ray * 0.12 + Math.sin(time * 0.12 + ray) * 0.015;
      const length = this.height * (0.7 + (ray % 4) * 0.12);
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(
        x + Math.cos(angle + Math.PI / 2) * length,
        y + Math.sin(angle + Math.PI / 2) * length,
      );
      context.strokeStyle = `rgba(255,218,151,${0.08 + (ray % 3) * 0.018})`;
      context.lineWidth = ray % 3 === 0 ? 8 : 3;
      context.stroke();
    }
    context.restore();
  }

  private drawFog(time: number) {
    const context = this.ctx;
    context.save();
    for (let band = 0; band < 5; band += 1) {
      const y =
        this.height * (0.81 + band * 0.04) +
        Math.sin(time * 0.14 + band) * this.height * 0.018;
      const x =
        ((time * (8 + band * 2) + band * this.width * 0.33) %
          (this.width * 1.5)) -
        this.width * 0.25;
      const haze = context.createRadialGradient(
        x,
        y,
        0,
        x,
        y,
        this.width * 0.42,
      );
      haze.addColorStop(0, `rgba(192,204,222,${0.12 + band * 0.012})`);
      haze.addColorStop(0.55, "rgba(192,204,222,0.06)");
      haze.addColorStop(1, "rgba(192,204,222,0)");
      context.fillStyle = haze;
      context.fillRect(0, this.height * 0.68, this.width, this.height * 0.32);
    }
    context.restore();
  }

  private triggerLightning(time: number) {
    const points: LightningBolt["points"] = [];
    let x = this.width * (0.15 + Math.random() * 0.7);
    const segments = 12;
    points.push({ x, y: -4 });
    for (let index = 1; index <= segments; index += 1) {
      x = clamp(
        x + (Math.random() - 0.5) * this.width * 0.16,
        this.width * 0.03,
        this.width * 0.97,
      );
      points.push({ x, y: (this.height * index) / segments });
    }
    const branches = [3, 6, 8].map((start) => {
      const base = points[start];
      const direction = Math.random() > 0.5 ? 1 : -1;
      return [
        base,
        {
          x: base.x + direction * this.width * 0.04,
          y: base.y + this.height * 0.055,
        },
        {
          x: base.x + direction * this.width * 0.095,
          y: base.y + this.height * 0.13,
        },
      ];
    });
    this.bolt = { points, branches, startedAt: time };
    this.flash = Math.max(this.flash, 0.62);
  }

  private drawLightning(time: number, dt: number) {
    const context = this.ctx;
    if (this.flash > 0) {
      context.fillStyle = `rgba(218,226,255,${this.flash * 0.28})`;
      context.fillRect(0, 0, this.width, this.height);
      this.flash = Math.max(0, this.flash - dt * 3.6);
    }
    if (!this.bolt) return;
    const age = time - this.bolt.startedAt;
    if (age > 0.52) {
      this.bolt = undefined;
      return;
    }
    const alpha = 1 - age / 0.52;
    context.save();
    context.globalAlpha = alpha;
    context.lineJoin = "round";
    context.lineCap = "round";
    context.shadowColor = "#b8ccff";
    context.shadowBlur = 22;
    context.strokeStyle = "rgba(190,210,255,0.9)";
    context.lineWidth = Math.max(3, this.width * 0.0025);
    this.strokeBolt(this.bolt.points);
    for (const branch of this.bolt.branches) this.strokeBolt(branch);
    context.shadowBlur = 5;
    context.strokeStyle = "rgba(255,255,255,0.98)";
    context.lineWidth = Math.max(1.2, this.width * 0.0008);
    this.strokeBolt(this.bolt.points);
    for (const branch of this.bolt.branches) this.strokeBolt(branch);
    context.restore();
  }

  private strokeBolt(points: Array<{ x: number; y: number }>) {
    const context = this.ctx;
    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    for (let index = 1; index < points.length; index += 1) {
      context.lineTo(points[index].x, points[index].y);
    }
    context.stroke();
  }

  private drawEvents() {
    const context = this.ctx;
    const width = this.width;
    const height = this.height;
    this.events = this.events.filter((event) => Date.now() - event.at < 4_200);
    for (const event of this.events) {
      const age = (Date.now() - event.at) / 1000;
      const progress = age / 4.2;
      context.globalAlpha = Math.max(0, 1 - progress);
      if (event.kind === "sub") {
        // The arch stays in the top third, clear of faces and gameplay.
        const x = width * 0.5;
        const y = height * 0.31;
        const rx = width * 0.42 * (0.85 + progress * 0.15);
        const ry = height * 0.27 * (0.85 + progress * 0.15);
        const rainbow = [
          "#fa7774",
          "#ffc66c",
          "#f3ec91",
          "#8fe0b5",
          "#7eb8ff",
          "#c09aff",
        ];
        rainbow.forEach((color, index) => {
          context.beginPath();
          context.strokeStyle = color;
          context.lineWidth = Math.max(4, width * 0.005);
          context.globalAlpha = Math.max(0, 1 - progress) * 0.6;
          context.ellipse(
            x,
            y,
            rx - index * Math.max(4, width * 0.006),
            ry - index * Math.max(4, height * 0.006),
            0,
            Math.PI,
            Math.PI * 2,
          );
          context.stroke();
        });
      }
      if (event.kind === "cheer") {
        const gems = Math.min(
          50,
          Math.max(8, Math.round(Math.log2((event.amount || 1) + 1) * 4)),
        );
        for (let index = 0; index < gems; index += 1) {
          const seed = (index * 47 + Math.floor(event.at / 1000)) % 101;
          const x = (seed / 100) * width;
          const y = ((age * 180 + index * 71) % (height + 90)) - 45;
          context.save();
          context.globalAlpha =
            Math.max(0, 1 - progress) * this.centerOpacity(x);
          context.translate(x, y);
          context.rotate(age * 2 + index);
          context.fillStyle = index % 2 ? "#9fe6ff" : "#ffe68b";
          context.beginPath();
          context.moveTo(0, -5);
          context.lineTo(4, 0);
          context.lineTo(0, 5);
          context.lineTo(-4, 0);
          context.closePath();
          context.fill();
          context.restore();
        }
      }
      if (event.kind === "tornado") {
        const x = width * (0.18 + progress * 0.64);
        const centerY = height * 0.78;
        for (let index = 0; index < 9; index += 1) {
          const ratio = index / 9;
          const rx = (0.018 + ratio * 0.07) * width;
          const ry = (0.014 + ratio * 0.025) * height;
          context.beginPath();
          context.ellipse(
            x,
            centerY + (ratio - 0.5) * height * 0.27,
            rx,
            ry,
            0,
            0,
            Math.PI * 2,
          );
          context.strokeStyle = `rgba(204,222,235,${0.45 * (1 - progress)})`;
          context.lineWidth = 2;
          context.stroke();
        }
      }
      if (event.kind === "follow") {
        const x = width * (0.25 + ((event.at % 1000) / 1000) * 0.5);
        const y = height * (0.23 + progress * 0.35);
        context.beginPath();
        context.fillStyle = "#b9dcff";
        context.ellipse(x, y, 5, 8, 0, 0, Math.PI * 2);
        context.fill();
      }
    }
    context.globalAlpha = 1;
  }
}
