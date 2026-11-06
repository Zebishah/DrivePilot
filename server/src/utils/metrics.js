const MAX_SERIES = 500;
const counters = new Map();
const timings = new Map();

function keyFor(name, labels = {}) {
  const safeLabels = Object.entries(labels)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${String(value).slice(0, 80)}`)
    .join(",");
  return `${name}|${safeLabels}`;
}

function increment(name, value = 1, labels = {}) {
  const key = keyFor(name, labels);
  if (!counters.has(key) && counters.size >= MAX_SERIES) return;
  counters.set(key, (counters.get(key) || 0) + Number(value || 0));
}

function observe(name, durationMs, labels = {}) {
  const key = keyFor(name, labels);
  if (!timings.has(key) && timings.size >= MAX_SERIES) return;
  const values = timings.get(key) || [];
  if (values.length < 100) values.push(Number(durationMs) || 0);
  timings.set(key, values);
}

function snapshot() {
  return {
    counters: Object.fromEntries(counters),
    timings: Object.fromEntries(
      [...timings.entries()].map(([key, values]) => [key, {
        count: values.length,
        totalMs: values.reduce((sum, value) => sum + value, 0),
        maxMs: Math.max(...values, 0),
      }]),
    ),
  };
}

function reset() {
  counters.clear();
  timings.clear();
}

module.exports = { MAX_SERIES, increment, observe, snapshot, reset };
