import assert from "node:assert/strict";
import { analyze, withWeather } from "../src/mood";
import { createScenario } from "../src/simulator";

const now = Date.now();
const scenarios = [
  { name: "hype", label: "sun" },
  { name: "chaos", label: "storm" },
  { name: "negative", label: "rain" },
  { name: "quiet", label: "fog" },
];

for (const scenario of scenarios) {
  const messages = createScenario(scenario.name, now);
  if (scenario.name === "quiet") {
    assert.equal(messages.length, 0, "quiet scenario should leave chat silent");
  } else {
    assert.ok(
      messages.length >= 40 && messages.length <= 80,
      "burst size should be realistic",
    );
    assert.ok(
      new Set(messages.map(({ user }) => user)).size >= 15,
      "burst should include 15+ chatters",
    );
  }

  const result = analyze(messages, now);
  assert.equal(
    result.weather,
    scenario.label,
    `${scenario.name} should reach its named weather`,
  );
  if (scenario.name === "chaos") {
    assert.ok(
      result.quiet <= 10,
      "a busy emote burst must not retain a high quiet score",
    );
  }
  console.log(`✓ ${scenario.name} → ${result.weather}`);
}

const demoClimate = withWeather(analyze([], now), "sun", true);
assert.equal(demoClimate.weather, "sun");
assert.equal(demoClimate.label, "Sunshine");
assert.match(demoClimate.forecast, /^☀️ Hype levels are rising(?: ·|\.)/);
assert.match(
  demoClimate.forecast,
  /(?:80|81|82|83|84|85|86|87|88|89|90|91|92|93|94|95)% chance of hype\.$/,
);
const lowChance = withWeather(
  { ...demoClimate, energy: 1, positivity: 99, chaos: 1, quiet: 1 },
  "sun",
);
assert.doesNotMatch(lowChance.forecast, /% chance/);
console.log("✓ demo weather title and forecast stay in sync");
