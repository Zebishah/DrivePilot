export enum BookingStatus {
  PENDING = "pending",
  COMPLETED = "completed",
  REFUND = "refund",
  CANCELLED = "cancelled",
  SEMI_CANCELLED = "semi_cancelled",
  CONFIRMED = "confirmed",
  MISSED = "missed",
  yet = "yet",
}

export interface Slot {
  _id: string;
  date: string;
  startTime: string;
  endTime: string;
  booked: boolean;
  status: string;
  paymentStatus?: string;
}

export interface PaymentMethod {
  type: string;
  cardNumber?: string;
}

export interface UserBooking {
  _id: string;
  firstName: string;
  profileImage: string;
  lastName: string;
  email: string;
  description?: string;
}

export interface StudentBooking {
  _id: string;
  studentId: UserBooking;
  instructorId: UserBooking;
  slots: Slot[];
  totalAmount: number;
  finalAmount: number;
  paymentMethod: PaymentMethod;
  status: BookingStatus;
  feedBackStatus: BookingStatus;
  createdAt: string;
  updatedAt: string;
}
