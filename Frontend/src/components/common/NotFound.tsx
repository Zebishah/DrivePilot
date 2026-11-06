import { Link } from "react-router-dom";
import BrandLogo from "../BrandLogo";

export default function NotFound() {

  return (
    <main className="route-error">
      <div>
        <BrandLogo size="lg" to="/" />
        <p className="route-error__eyebrow">404 · Page not found</p>
        <h1>Let’s get you back on the road</h1>
        <p>This link may have changed or the page may no longer exist.</p>
        <div className="route-error__actions">
          <Link to="/">Return home</Link>
          <Link to="/professional">Find driving lessons</Link>
        </div>
      </div>
    </main>
  );
}
