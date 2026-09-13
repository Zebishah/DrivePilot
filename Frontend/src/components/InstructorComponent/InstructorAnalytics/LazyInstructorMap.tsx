import { lazy, Suspense } from "react";
import type React from "react";

const InstructorMap = lazy(() =>
  import("./InstructorMap").then((module) => ({ default: module.InstructorMap })),
);

export default function LazyInstructorMap(
  props: React.ComponentProps<typeof InstructorMap>,
) {
  return (
    <Suspense
      fallback={
        <div
          className={`h-80 rounded-2xl bg-slate-100 animate-pulse ${props.className ?? ""}`}
          role="status"
          aria-label="Loading map"
        />
      }
    >
      <InstructorMap {...props} />
    </Suspense>
  );
}
