import { StudentBooking } from "../../types/Bookings";
import { EmptyState } from "./EmptyState";
import { FeedbackTableRow } from "./FeedBackTableRow";

interface FeedbackTableProps {
  bookings: StudentBooking[];
}

export const FeedbackTable: React.FC<FeedbackTableProps> = ({ bookings }) => {
  if (bookings.length === 0) {
    return (
      <EmptyState
        title="No completed lessons available for feedback yet."
        description="Lessons will appear here automatically once they are completed."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-2 font-medium text-gray-600">
              Student Name
            </th>
            <th className="text-left py-3 px-2 font-medium text-gray-600">
              Lesson Number
            </th>
            <th className="text-left py-3 px-2 font-medium text-gray-600">
              Amount
            </th>
            <th className="text-left py-3 px-2 font-medium text-gray-600">
              Status
            </th>
            <th className="text-left py-3 px-2 font-medium text-gray-600">
              Feedback
            </th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((booking) => (
            <FeedbackTableRow key={booking._id} booking={booking} />
          ))}
        </tbody>
      </table>
    </div>
  );
};
