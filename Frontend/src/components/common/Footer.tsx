import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import BrandLogo from "../BrandLogo";

export default function Footer() {
  return (
    <footer className="dsp-public-footer">
      <div className="dsp-public-container">
        <div className="dsp-public-footer__main"><div><BrandLogo className="dsp-public-logo dsp-public-logo--footer" to="/" /><p>A connected marketplace and operations platform for modern driving lessons.</p></div><div className="dsp-public-footer__links"><div><strong>Product</strong><a href="/#roles">For students</a><a href="/#roles">For instructors</a><a href="/#platform">Platform</a></div><div><strong>Explore</strong><a href="/#workflow">How it works</a><a href="/#engineering">Engineering</a><a href="/#faq">FAQ</a></div><div><strong>Account</strong><Link to="/auth/signin">Sign in</Link><Link to="/auth/signup">Create an account</Link><Link to="/contact">Support</Link></div></div></div>
        <div className="dsp-public-footer__bottom"><span>© {new Date().getFullYear()} DSP Marketplace</span><span>Learn clearly. Teach confidently. Operate simply.</span><span className="dsp-public-footer__legal"><Link to="/terms">Terms of Use</Link><Link to="/privacy">Privacy Policy</Link><a href="#top">Back to top <ArrowUpRight size={14} /></a></span></div>
      </div>
    </footer>
  );
}
