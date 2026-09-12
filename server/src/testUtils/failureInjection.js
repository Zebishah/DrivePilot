class FailureInjector {
  constructor() { this.failures = new Map(); }

  failNext(point, error = new Error(`Injected failure: ${point}`)) {
    this.failures.set(point, typeof error === "function" ? error : () => error);
    return this;
  }

  async run(point, callback) {
    const failure = this.failures.get(point);
    if (failure) {
      this.failures.delete(point);
      throw failure();
    }
    return callback();
  }

  has(point) { return this.failures.has(point); }
}

module.exports = { FailureInjector };
