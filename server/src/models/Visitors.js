// models/Visitor.js
const mongoose = require("mongoose");

const visitorSchema = new mongoose.Schema(
  {
    // Unique identifier for the visitor (IP + User Agent hash)
    visitorId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // IP address of the visitor
    ipAddress: {
      type: String,
      required: true,
    },

    // User agent string
    userAgent: {
      type: String,
      required: true,
    },

    // First visit timestamp
    firstVisit: {
      type: Date,
      default: Date.now,
    },

    // Last visit timestamp
    lastVisit: {
      type: Date,
      default: Date.now,
    },

    // Total number of visits
    visitCount: {
      type: Number,
      default: 1,
    },

    // Additional info (optional)
    country: String,
    city: String,
    device: String,
    browser: String,

    // Track if this is a unique visitor
    isUniqueVisitor: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for better query performance
visitorSchema.index({ ipAddress: 1, userAgent: 1 });
visitorSchema.index({ firstVisit: 1 });

const Visitor = mongoose.model("Visitor", visitorSchema);

module.exports = Visitor;
