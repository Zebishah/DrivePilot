import { useEffect, useState } from "react";

export function useEmailResendCooldown(initialSeconds = 0) {
  const [availableAt, setAvailableAt] = useState(
    () => Date.now() + initialSeconds * 1000,
  );
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    if (availableAt <= Date.now()) return;

    const interval = window.setInterval(() => {
      const currentTime = Date.now();
      setNow(currentTime);
      if (currentTime >= availableAt) window.clearInterval(interval);
    }, 500);

    return () => window.clearInterval(interval);
  }, [availableAt]);

  const restartCooldown = () => {
    const currentTime = Date.now();
    setNow(currentTime);
    setAvailableAt(currentTime + 60_000);
  };

  return {
    secondsRemaining: Math.max(0, Math.ceil((availableAt - now) / 1000)),
    restartCooldown,
  };
}
