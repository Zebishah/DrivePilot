// graphql/visitorResolvers.js

const crypto = require("crypto");
const Visitor = require("../../models/Visitors");
const { requireAdmin } = require("../../utils/authorization");

// Helper function to create unique visitor ID
const createVisitorId = (ipAddress, userAgent) => {
  return crypto
    .createHash("sha256")
    .update(ipAddress + userAgent)
    .digest("hex")
    .substring(0, 32);
};

// Helper function to get date ranges
const getDateRanges = () => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  return { today, weekAgo, monthAgo };
};

const visitorResolvers = {
  Query: {
    // Get visitor statistics
    getVisitorStats: async (_, __, { user }) => {
      requireAdmin(user);
      try {
        const { today, weekAgo, monthAgo } = getDateRanges();

        const [
          totalUniqueVisitors,
          totalVisits,
          todayVisitors,
          thisWeekVisitors,
          thisMonthVisitors,
        ] = await Promise.all([
          Visitor.countDocuments({ isUniqueVisitor: true }),
          Visitor.aggregate([
            { $group: { _id: null, total: { $sum: "$visitCount" } } },
          ]),
          Visitor.countDocuments({
            firstVisit: { $gte: today },
            isUniqueVisitor: true,
          }),
          Visitor.countDocuments({
            firstVisit: { $gte: weekAgo },
            isUniqueVisitor: true,
          }),
          Visitor.countDocuments({
            firstVisit: { $gte: monthAgo },
            isUniqueVisitor: true,
          }),
        ]);

        return {
          totalUniqueVisitors,
          totalVisits: totalVisits[0]?.total || 0,
          todayVisitors,
          thisWeekVisitors,
          thisMonthVisitors,
        };
      } catch (error) {
        throw new Error(`Failed to get visitor stats: ${error.message}`);
      }
    },

    // Get all visitors with pagination
    getAllVisitors: async (_, { limit = 50, offset = 0 }, { user }) => {
      requireAdmin(user);
      try {
        return await Visitor.find()
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(offset);
      } catch (error) {
        throw new Error(`Failed to get visitors: ${error.message}`);
      }
    },

    // Get visitor by ID
    getVisitorById: async (_, { visitorId }, { user }) => {
      requireAdmin(user);
      try {
        return await Visitor.findOne({ visitorId });
      } catch (error) {
        throw new Error(`Failed to get visitor: ${error.message}`);
      }
    },
  },

  Mutation: {
    // Record a visitor (handles both new and returning visitors)
    recordVisitor: async (_, { input }, { req }) => {
      try {
        const ipAddress =
          req.headers["x-forwarded-for"] ||
          req.connection.remoteAddress ||
          "0.0.0.0";

        const { userAgent, country, city, device, browser } = input;

        const visitorId = createVisitorId(ipAddress, userAgent);

        // Check if visitor already exists
        let visitor = await Visitor.findOne({ visitorId });

        if (visitor) {
          // Existing visitor - update visit count and last visit
          visitor.visitCount += 1;
          visitor.lastVisit = new Date();
          visitor.isUniqueVisitor = false; // Not a unique visitor anymore for this session

          // Update optional fields if provided
          if (country) visitor.country = country;
          if (city) visitor.city = city;
          if (device) visitor.device = device;
          if (browser) visitor.browser = browser;

          await visitor.save();
        } else {
          // New visitor - create new record
          visitor = new Visitor({
            visitorId,
            ipAddress,
            userAgent,
            country,
            city,
            device,
            browser,
            visitCount: 1,
            isUniqueVisitor: true,
          });

          await visitor.save();
        }

        return visitor;
      } catch (error) {
        // Handle duplicate key error
        if (error.code === 11000) {
          // If duplicate, try to find and update the existing visitor
          const visitorId = createVisitorId(input.ipAddress, input.userAgent);
          let visitor = await Visitor.findOne({ visitorId });

          if (visitor) {
            visitor.visitCount += 1;
            visitor.lastVisit = new Date();
            visitor.isUniqueVisitor = false;
            await visitor.save();
            return visitor;
          }
        }

        throw new Error(`Failed to record visitor: ${error.message}`);
      }
    },
  },
};

module.exports = visitorResolvers;
