const crypto = require("crypto");

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stable(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function hash(value) {
  return crypto.createHash("sha256").update(stable(value)).digest("hex").slice(0, 32);
}

module.exports = {
  instructorProfile: (id) => String(id),
  instructorTariff: (id) => String(id),
  instructorAvailability: (id, date) => `${id}:${date}`,
  instructorSearch: (args) => hash(args),
  analytics: (range) => hash(range),
};
