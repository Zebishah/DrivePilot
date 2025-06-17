export async function getAllRequiredSlotsForLesson(lessonId, instructorId) {
  // This could be:
  // 1. A lesson model that defines all required slots
  // 2. A calculation based on lesson duration and slot duration
  // 3. A predefined structure in your database

  // Example implementation (adjust according to your data structure):
  const lesson = await avai.findById(lessonId);
  if (!lesson) {
    throw new Error("Lesson not found");
  }

  return lesson.requiredSlots || []; // Assuming lesson has a requiredSlots field
}
