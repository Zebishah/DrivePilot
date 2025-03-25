const mongoose = require('mongoose');

const availabilitySlotSchema = new mongoose.Schema({
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Create index for efficient querying
availabilitySlotSchema.index({ teacherId: 1, date: 1 });

module.exports = mongoose.model('TeacherAvailability', availabilitySlotSchema); 