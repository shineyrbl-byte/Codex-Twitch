import assert from "node:assert/strict";
import { EVENT_LAYOUT } from "../src/event-layout";

const rainbowApex =
  EVENT_LAYOUT.subRainbowCenterY - EVENT_LAYOUT.subRainbowRadiusY;
assert.ok(rainbowApex >= 0, "sub rainbow must stay inside the canvas");
assert.ok(
  EVENT_LAYOUT.subRainbowCenterY <= 1 / 3,
  "sub rainbow endpoints must stay in the top third",
);
assert.ok(
  EVENT_LAYOUT.alertTopPercent <= 10,
  "event banners must stay near the top edge",
);
assert.ok(
  EVENT_LAYOUT.effectDurationMs <= 5_000,
  "large event effects must fade within five seconds",
);
assert.ok(
  EVENT_LAYOUT.toastHideMs + 300 <= EVENT_LAYOUT.effectDurationMs,
  "event toast transition must finish with the canvas effect",
);
console.log("✓ rainbow, alerts, and event duration stay in safe positions");
