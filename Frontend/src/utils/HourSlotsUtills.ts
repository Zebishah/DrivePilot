// utils/hourSlotUtils.ts
import dayjs from "dayjs";
import { HourSlot } from "../types/HourSlots";

export const generateHourSlots = (
  originalSlotId: string,
  date: string,
  startTime: string,
  endTime: string,
  booked: boolean
): HourSlot[] => {
  const slots: HourSlot[] = [];
  const start = dayjs(`${date} ${startTime}`);
  const end = dayjs(`${date} ${endTime}`);

  let current = start;
  let index = 0;

  while (current.isBefore(end)) {
    const slotEnd = current.add(1, "hour");
    // Don't create a slot if it would extend beyond the original end time
    if (slotEnd.isAfter(end)) break;

    slots.push({
      id: `${originalSlotId}_hour_${index}`,
      startTime: current.format("HH:mm"),
      endTime: slotEnd.format("HH:mm"),
      booked,
      date,
      originalSlotId,
    });

    current = slotEnd;
    index++;
  }

  return slots;
};

export const formatDuration = (startTime: string, endTime: string): string => {
  const start = dayjs(`2000-01-01 ${startTime}`);
  const end = dayjs(`2000-01-01 ${endTime}`);
  const hours = end.diff(start, "hour", true);
  return `${hours} hr${hours !== 1 ? "s" : ""} lesson`;
};

export const getDurationInHours = (timeRange: string): number => {
  const [startTime, endTime] = timeRange.split(" - ");
  const start = dayjs(`2000-01-01 ${startTime}`);
  const end = dayjs(`2000-01-01 ${endTime}`);
  return end.diff(start, "hour", true);
};
