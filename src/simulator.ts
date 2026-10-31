import type { ChatMessage, WeatherEvent } from "./types";

const chatters = [
  "Mika",
  "koi",
  "tyler",
  "moon",
  "ash",
  "luma",
  "iris",
  "jay",
  "fern",
  "river",
  "pixel",
  "cloudy",
  "nova",
  "bee",
  "sora",
  "ren",
  "sage",
  "fennel",
  "moss",
  "kit",
];

const templates: Record<string, string[]> = {
  hype: [
    "W stream, this is amazing PogChamp 🔥",
    "LOVE this play, lets go!!! ❤️",
    "Incredible! We win these! ✨",
    "PogChamp you are so good at this",
    "HYPE HYPE, beautiful round!! 💖",
    "That was awesome, lets go! 👏",
  ],
  chaos: [
    "POG POG POG PogChamp KEKW POG",
    "AAAAAAAAA KEKW KEKW KEKW",
    "OMEGALUL PogChamp PogChamp POG",
    "💀💀💀💀💀 Pepega Pepega",
    "KEKW POG PogChamp OMEGALUL KEKW",
    "NO WAY!!! AAAAAA!!! POG POG",
  ],
  negative: [
    "That was awful, this is so bad",
    "Worst play today, hate that",
    "This is boring and terrible",
    "No, that was a bad call 😡",
    "Awful round, what a mess",
    "That was sad and not good",
  ],
};

export function createScenario(scene: string, now = Date.now()): ChatMessage[] {
  if (scene === "quiet") return [];
  const normalized = scene === "storm" ? "chaos" : scene;
  const messages = templates[normalized];
  if (!messages) return [];

  const count = 60;
  return Array.from({ length: count }, (_, index) => {
    const text = messages[index % messages.length];
    const uniqueSuffix =
      normalized === "hype" || normalized === "negative" ? ` ${index + 1}` : "";
    const age = 12_000 - (index / (count - 1)) * 12_000;
    return {
      user: chatters[index % chatters.length],
      text: `${text}${uniqueSuffix}`,
      at: now - age,
      emotes: [],
    };
  });
}

export function startScenario(
  scene: string,
  onBatch: (messages: ChatMessage[]) => void,
  batchSize = 6,
  intervalMs = 1_000,
): () => void {
  const messages = createScenario(scene);
  if (scene === "quiet") {
    onBatch([]);
    return () => {};
  }

  onBatch([]);
  let index = 0;
  const sendBatch = () => {
    onBatch(messages.slice(index, index + batchSize));
    index += batchSize;
    if (index >= messages.length) window.clearInterval(timer);
  };
  sendBatch();
  const timer = window.setInterval(sendBatch, intervalMs);
  return () => window.clearInterval(timer);
}

export function startOverlaySimulator(
  onBatch: (messages: ChatMessage[]) => void,
  onEvent: (event: WeatherEvent) => void,
): () => void {
  const scenes = ["quiet", "hype", "chaos", "negative"];
  let index = 0;
  let stopBurst = () => {};
  const playScene = () => {
    stopBurst();
    const scene = scenes[index % scenes.length];
    stopBurst = startScenario(scene, onBatch);
    if (index % 2 === 1) {
      const kind = index % 4 === 1 ? "sub" : "raid";
      onEvent({
        kind,
        name: kind === "sub" ? "Mika" : "PixelParty",
        amount: 24,
        at: Date.now(),
      });
    }
    index += 1;
  };
  playScene();
  const timer = window.setInterval(playScene, 15_000);
  return () => {
    window.clearInterval(timer);
    stopBurst();
  };
}
