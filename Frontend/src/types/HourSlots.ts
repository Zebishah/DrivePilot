// types/hourSlot.types.ts
export interface HourSlot {
  id: string;
  startTime: string;
  endTime: string;
  date: string;
  originalSlotId: string;
  booked: boolean;
}

export interface HourSlotModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (selectedSlots: HourSlot[]) => void;
  originalSlot: {
    id: string;
    time: string;
    duration: string;
    date: string;
    booked: boolean;
  };
  loading?: boolean;
}

export interface SlotCardProps {
  slot: HourSlot;
  isSelected: boolean;
  onClick: (slotId: string) => void;
}
export const fallbackInstructor = {
  firstName: "Instructor",
  lastName: "Not Found",
  location: "N/A",
  imageUrl: "/images/instructorprofile.png",
  experience: 0,
  description: "No description available",
  rating: 0,
};

export const fallbackTariff = {
  lessonFee: 0,
  bulkPackages: [],
  packageDiscount: 0,
};
