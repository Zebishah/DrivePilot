import { lazy, Suspense } from "react";

const ContactMap = lazy(() => import("./ContactMap"));

export default function LazyContactMap() {
  return (
    <Suspense
      fallback={
        <div
          className="h-[400px] w-full rounded-2xl bg-slate-100 animate-pulse"
          role="status"
          aria-label="Loading map"
        />
      }
    >
      <ContactMap />
    </Suspense>
  );
}
