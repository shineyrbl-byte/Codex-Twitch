import assert from "node:assert/strict";
import { analyze } from "../src/mood";
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
  console.log(`✓ ${scenario.name} → ${result.weather}`);
}
