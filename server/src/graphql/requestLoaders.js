const { User } = require("../models/User");
const StudentBooking = require("../models/studentBooking.model");

function createBatchLoader(batchLoad) {
  const cache = new Map();
  let pending = [];
  let scheduled = false;

  const dispatch = async () => {
    scheduled = false;
    const current = pending;
    pending = [];
    const uniqueKeys = [...new Set(current.map(({ key }) => String(key)))];

    try {
      const values = await batchLoad(uniqueKeys);
      const byKey = new Map(
        values
          .filter(Boolean)
          .map((value) => [String(value._id ?? value.id), value]),
      );
      current.forEach(({ key, resolve }) => resolve(byKey.get(String(key)) || null));
    } catch (error) {
      current.forEach(({ reject }) => reject(error));
    }
  };

  return {
    load(key) {
      if (key == null) return Promise.resolve(null);
      const normalizedKey = String(key);
      if (cache.has(normalizedKey)) return cache.get(normalizedKey);

      const promise = new Promise((resolve, reject) => {
        pending.push({ key: normalizedKey, resolve, reject });
      });
      cache.set(normalizedKey, promise);
      if (!scheduled) {
        scheduled = true;
        queueMicrotask(dispatch);
      }
      return promise;
    },
  };
}

function createRequestLoaders({ userModel = User, bookingModel = StudentBooking } = {}) {
  return {
    user: createBatchLoader((ids) =>
      userModel.find({ _id: { $in: ids } })
        .select("_id firstName lastName email profileImage location address")
        .lean(),
    ),
    booking: createBatchLoader((ids) =>
      bookingModel.find({ _id: { $in: ids } })
        .select("_id studentId instructorId slots")
        .lean(),
    ),
  };
}

module.exports = { createBatchLoader, createRequestLoaders };
