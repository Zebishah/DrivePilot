export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  profileImage?: string;
}

export interface Instructor extends User {
  carName?: string;
  transmissionType?: "Automatic" | "Manual";
  experience?: string;
  location?: string;
}

export interface Student extends User {
  homeAddress?: string;
  location?: string;
  zipCode?: string;
}

export interface BookingSlot {
  _id: string;
  date: string;
  startTime: string;
  endTime: string;
  booked: boolean;
  review: boolean;
  status: "available" | "booked" | "cancelled" | "refund";
}

export interface PaymentMethod {
  type: string;
  cardNumber?: string;
}

export interface StudentBooking {
  _id: string;
  studentId: Student;
  instructorId: Instructor;
  slots: BookingSlot[];
  totalAmount: number;
  cancellationDate: string;
  finalAmount: number;
  paymentMethod: PaymentMethod;
  feedBackStatus: "pending" | "completed";
  status:
    | "pending"
    | "confirmed"
    | "cancelled"
    | "refund"
    | "completed"
    | "semi_cancelled";
  createdAt: string;
  updatedAt: string;
}

export interface UpdateBookingStatusInput {
  bookingId: string;
  slotId: string;
  status:
    | "pending"
    | "confirmed"
    | "cancelled"
    | "refund"
    | "completed"
    | "semi_cancelled";
}

export interface CancelBookingInput {
  bookingId: string;
  slotId: string;
  studentId: string;
}
