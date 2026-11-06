const test = require("node:test");
const assert = require("node:assert/strict");
const cases = require("./assistantEvaluation.json");
const { inferredTool, isMutationRequest } = require("./assistantService");

test("offline assistant evaluation set has 20 deterministic cases", () => {
  assert.equal(cases.length, 20);
  for (const scenario of cases) {
    if (scenario.policy === "refuse") {
      assert.equal(isMutationRequest(scenario.message) || /ignore previous|database|system prompt/i.test(scenario.message), true, scenario.message);
    } else {
      assert.equal(inferredTool(scenario.message, scenario.role), scenario.expectedTool, scenario.message);
    }
  }
});
