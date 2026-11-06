function normalizePagination({ limit, offset, defaultLimit = 50, maxLimit = 200 }) {
  const requestedLimit = Number(limit);
  const requestedOffset = Number(offset);
  return {
    limit: Math.min(
      Math.max(Number.isFinite(requestedLimit) ? Math.trunc(requestedLimit) : defaultLimit, 1),
      maxLimit,
    ),
    offset: Math.max(
      Number.isFinite(requestedOffset) ? Math.trunc(requestedOffset) : 0,
      0,
    ),
  };
}

module.exports = { normalizePagination };
