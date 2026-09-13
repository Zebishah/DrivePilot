export default function RouteLoadingFallback() {
  return (
    <div className="route-loading" role="status" aria-live="polite">
      <span className="route-loading__spinner" aria-hidden="true" />
      <span>Loading page…</span>
    </div>
  );
}
