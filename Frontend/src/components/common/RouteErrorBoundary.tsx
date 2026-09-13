import type React from "react";

interface State {
  hasError: boolean;
}

export default class RouteErrorBoundary extends React.Component<
  React.PropsWithChildren,
  State
> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="route-error" role="alert">
        <div>
          <p className="route-error__eyebrow">DSP Marketplace</p>
          <h1>We couldn&apos;t load this page</h1>
          <p>Try again, or return to your dashboard if the problem continues.</p>
          <div className="route-error__actions">
            <button type="button" onClick={() => window.location.reload()}>
              Try again
            </button>
            <a href="/">Return home</a>
          </div>
        </div>
      </main>
    );
  }
}
