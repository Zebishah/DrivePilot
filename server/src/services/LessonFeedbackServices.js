const Feedback = require("../models/Feedback");

const createFeedback = async (data) => {
  const feedback = new Feedback(data);
  return await feedback.save();
};

const getFeedbackByLessonId = async (lessonId) => {
  return await Feedback.findOne({ lessonId });
};

const getAllFeedbacks = async () => {
  return await Feedback.find();
};

module.exports = {
  createFeedback,
  getFeedbackByLessonId,
  getAllFeedbacks,
};
