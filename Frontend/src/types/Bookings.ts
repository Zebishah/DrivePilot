export enum BookingStatus {
  PENDING = "pending",
  COMPLETED = "completed",
}

export interface Slot {
  date: string;
  startTime: string;
  endTime: string;
  booked: boolean;
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
  paymentMethod: PaymentMethod;
  status: BookingStatus;
  feedBackStatus: BookingStatus;
  createdAt: string;
  updatedAt: string;
}
