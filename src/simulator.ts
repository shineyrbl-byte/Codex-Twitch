import type { ChatMessage, WeatherEvent } from "./types";

const scenes: Record<string, Array<[string, string]>> = {
  hype: [
    ["Mika", "LET'S GO!!! PogChamp 🔥"],
    ["koi", "this is amazing!!"],
    ["tyler", "W stream ❤️"],
    ["moon", "PogChamp PogChamp"],
    ["ash", "GO GO GO!!!"],
    ["luma", "KEKW"],
    ["mika", "WE WIN THESE"],
    ["koi", "🔥🔥🔥"],
    ["iris", "love this so much"],
    ["jay", "POG"],
  ],
  chaos: [
    ["mika", "POG POG POG POG"],
    ["koi", "KEKW KEKW KEKW"],
    ["jay", "AAAAAA!!!"],
    ["ash", "OMEGALUL"],
    ["luma", "PogChamp PogChamp PogChamp"],
    ["tyler", "💀💀💀💀💀"],
    ["iris", "KEKW KEKW"],
    ["mika", "AAAAAAAAA"],
    ["jay", "POG POG POG"],
    ["ash", "Pepega"],
  ],
  negative: [
    ["koi", "this is boring"],
    ["ash", "that was bad"],
    ["jay", "not great"],
    ["tyler", "worst play today"],
    ["iris", "so sad 😡"],
  ],
};

export function createScenario(scene: string, now = Date.now()): ChatMessage[] {
  if (scene === "quiet") return [];
  return (scenes[scene] || []).map(([user, text]) => ({
    user,
    text,
    at: now - Math.random() * 12_000,
    emotes: [],
  }));
}

export function startOverlaySimulator(
  onScene: (messages: ChatMessage[]) => void,
  onEvent: (event: WeatherEvent) => void,
): () => void {
  const sceneNames = ["quiet", "hype", "chaos", "negative"];
  let index = 0;
  const playScene = () => {
    onScene(createScenario(sceneNames[index % sceneNames.length]));
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
  const timer = window.setInterval(playScene, 10_000);
  return () => window.clearInterval(timer);
}
