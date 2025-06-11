export interface LessonFeedback {
  id: string;
  lessonId: string;
  instructorId: string;
  instructorEmail: string;
  skillsWorkedOn: string[];
  hoursRemaining: number;
  pointsForNextLesson: string;
  feedbackStatus: FeedbackStatus;
  createdAt: string;
  updatedAt: string;
}

export enum FeedbackStatus {
  PENDING = "pending",
  COMPLETED = "completed",
}

export interface CreateLessonFeedbackInput {
  lessonId: string;
  instructorId: string;
  instructorEmail: string;
  skillsWorkedOn: string[];
  hoursRemaining: number;
  pointsForNextLesson: string;
}

export interface UpdateLessonFeedbackInput {
  skillsWorkedOn?: string[];
  hoursRemaining?: number;
  pointsForNextLesson?: string;
}

export interface FeedbackFormData {
  skillsWorkedOn: string[];
  hoursRemaining: string;
  pointsForNextLesson: string;
}
export interface Feedback {
  _id: string;
  lessonId: string;
  instructorId: string;
  instructorEmail: string;
  feedbackTags: string[];
  title: string;
  message: string;
  createdAt: string;
}
export interface FeedbackData {
  skills: string[];
  hoursRemaining: string;
  pointsToWorkOn: string;
}

export interface SkillOption {
  value: string;
  label: string;
}
export type ViewMode = "view" | "edit" | "create";
export const skillOptions: SkillOption[] = [
  { value: "communication", label: "Communication" },
  { value: "problem-solving", label: "Problem Solving" },
  { value: "teamwork", label: "Teamwork" },
  { value: "time-management", label: "Time Management" },
  { value: "technical-skills", label: "Technical Skills" },
  { value: "leadership", label: "Leadership" },
  { value: "creativity", label: "Creativity" },
  { value: "adaptability", label: "Adaptability" },
  { value: "critical-thinking", label: "Critical Thinking" },
  { value: "presentation", label: "Presentation Skills" },
];
