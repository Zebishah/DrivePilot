import { useEffect, useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import BrandLogo from "../BrandLogo";

const links = [
  ["For Students", "#roles"],
  ["For Instructors", "#roles"],
  ["How it works", "#workflow"],
  ["Platform", "#platform"],
  ["Engineering", "#engineering"],
  ["FAQ", "#faq"],
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname, location.hash]);

  return (
    <header className="dsp-public-header">
      <div className="dsp-public-container dsp-public-header__inner">
        <BrandLogo className="dsp-public-logo" to="/" aria-label="DSP Marketplace home" />
        <button className="dsp-public-menu-button" type="button" onClick={() => setOpen(!open)} aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open}><span>{open ? <X size={21} /> : <Menu size={21} />}</span></button>
        <nav className={`dsp-public-nav ${open ? "is-open" : ""}`} aria-label="Main navigation">
          <div className="dsp-public-nav__links">{links.map(([label, href]) => { const target = location.pathname === "/" ? href : `/${href}`; return <a key={label} href={target}>{label}<ChevronDown size={13} /></a>; })}</div>
          <div className="dsp-public-nav__actions"><NavLink className="dsp-public-nav__signin" to="/auth/signin">Sign in</NavLink><NavLink className="dsp-public-button dsp-public-button--primary dsp-public-button--small" to="/auth/signup">Get started <span aria-hidden="true">→</span></NavLink></div>
        </nav>
      </div>
    </header>
  );
}
