export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) {
    return `${hours}hrs ${mins}min`;
  } else if (hours > 0) {
    return `${hours}hrs`;
  } else {
    return `${mins}min`;
  }
};
