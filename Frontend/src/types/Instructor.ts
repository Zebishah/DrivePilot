export interface InstructorDocument {
  _id: string;
  documentType: string;
  documentUrl: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
  reSubmitted: string;
}

export interface Instructor {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  address: string;
  zipCode: string;
  experience: string;
  description: string;
  gender: string;
  reviewsCount: number;
  carName: string;
  transmissionType: string;
  verificationStatus: "pending" | "verified" | "rejected";
  profileImage?: string;
  documents: InstructorDocument[];
  createdAt: string;
  updatedAt: string;
  isUserVerified: boolean;
}

export interface FlattenedDocument extends InstructorDocument {
  instructor: Omit<Instructor, "documents">;
  isCollective?: boolean;
  collectiveGroupKey?: string;
  allSameTypeDocs?: InstructorDocument[];
  frontDocument?: InstructorDocument;
  backDocument?: InstructorDocument;
}
export interface FilterOptions {
  gender?: "Male" | "Female" | "Other" | "";
  isVerified?: boolean | "" | undefined;
  experience?: string;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
}
