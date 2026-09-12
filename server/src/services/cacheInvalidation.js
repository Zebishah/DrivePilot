const { cache } = require("./cacheService");
const keys = require("./cacheKeys");

function createCacheInvalidation(cacheClient = cache) {
  async function invalidateInstructorPublic(id) {
    await Promise.allSettled([
      cacheClient.delete("instructor_profile", keys.instructorProfile(id)),
      cacheClient.deletePattern("instructor_search"),
    ]);
  }

  async function invalidateInstructorSearch() {
    await cacheClient.deletePattern("instructor_search");
  }

  async function invalidateTariff(id) {
    await Promise.allSettled([
      cacheClient.delete("instructor_tariff", keys.instructorTariff(id)),
      invalidateInstructorSearch(),
    ]);
  }

  async function invalidateAvailability(id) {
    await Promise.allSettled([
      cacheClient.deletePattern("instructor_availability", `${id}:*`),
      invalidateInstructorPublic(id),
    ]);
  }

  async function invalidateFaqs() {
    await cacheClient.delete("faq", "public");
  }

  async function invalidatePlatformSettings() {
    await cacheClient.delete("platform", "settings");
  }

  return {
    invalidateInstructorPublic,
    invalidateInstructorSearch,
    invalidateTariff,
    invalidateAvailability,
    invalidateFaqs,
    invalidatePlatformSettings,
  };
}

module.exports = { createCacheInvalidation, ...createCacheInvalidation() };
