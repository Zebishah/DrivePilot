import { ArrowUpRight } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import BrandLogo from "../BrandLogo";

export default function Footer() {
  const isHome = useLocation().pathname === "/";
  return (
    <footer className="dsp-public-footer">
      <div className="dsp-public-container">
        <div className="dsp-public-footer__main">
          <div>
            <BrandLogo
              className="dsp-public-logo dsp-public-logo--footer"
              to="/"
            />
            <p>
              Find driving instructors, book lessons online, and keep your
              learning or teaching in one connected place.
            </p>
            {isHome && (
              <span className="ai-footer-note">
                <span /> Real driving lessons. Helpful AI.
              </span>
            )}
          </div>
          <div className="dsp-public-footer__links">
            <div>
              <strong>Product</strong>
              <a href="/#roles">For students</a>
              <a href="/#teach">For instructors</a>
              <Link to="/professional">Find driving lessons</Link>
            </div>
            <div>
              <strong>Explore</strong>
              <a href="/#workflow">How it works</a>
              <a href="/#engineering">
                {isHome ? "Your AI assistant" : "Engineering"}
              </a>
              <a href="/#recruiters">Recruiter demos</a>
              <a href="/#faq">FAQ</a>
            </div>
            <div>
              <strong>Account</strong>
              <Link to="/auth/signin">Sign in</Link>
              <Link to="/auth/signup">Create an account</Link>
              <Link to="/contact">Support</Link>
            </div>
          </div>
        </div>
        {isHome && (
          <div className="ai-footer-wordmark" aria-hidden="true">
            drive the future<span>↗</span>
          </div>
        )}
        <div className="dsp-public-footer__bottom">
          <span>© {new Date().getFullYear()} DSP Marketplace</span>
          <span>Learn clearly. Teach confidently. Operate simply.</span>
          <span className="dsp-public-footer__legal">
            <Link to="/terms">Terms of Use</Link>
            <Link to="/privacy">Privacy Policy</Link>
            <a href="#top">
              Back to top <ArrowUpRight size={14} />
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
