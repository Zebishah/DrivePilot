import { StudentBooking } from "../../../types/Bookings";
import { FeedbackButton } from "./FeedBackButton";
import { FeedbackStatus } from "./FeedBackStatus";
import { StudentAvatar } from "./StudentAvatar";
import { formatCHF } from "../../../utils/money";

interface FeedbackTableRowProps {
  booking: StudentBooking;
}

export const FeedbackTableRow: React.FC<FeedbackTableRowProps> = ({
  booking,
}) => (
  <tr className="border-b border-gray-100">
    <td className="py-4 px-2">
      <div className="flex items-center space-x-3">
        <StudentAvatar student={booking.studentId} />
        <span className="font-medium text-gray-800">
          {booking.studentId.firstName} {booking.studentId.lastName}
        </span>
      </div>
    </td>
    <td className="py-4 px-2 text-gray-600">
      Lesson {booking._id.charAt(booking._id.length - 1)}
    </td>

    <td className="py-4 px-2 text-gray-600">{formatCHF(booking.totalAmount)}</td>
    <td className="py-4 px-2">
      <FeedbackStatus status={booking.feedBackStatus} />
    </td>
    <td className="py-4 px-2">
      <FeedbackButton
        bookingId={booking._id}
        studentId={booking.studentId._id}
        feedbackStatus={booking.feedBackStatus}
      />
    </td>
  </tr>
);
