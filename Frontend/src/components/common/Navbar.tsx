import { useEffect, useState } from "react";
import { ArrowUpRight, ChevronDown, Menu, X } from "lucide-react";
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
  const isHome = location.pathname === "/";
  const navigationLinks = isHome
    ? [
        ["Find lessons", "/professional"],
        ["How it works", "#workflow"],
        ["For instructors", "#teach"],
        ["Project demo", "#recruiters"],
      ]
    : links;

  useEffect(() => setOpen(false), [location.pathname, location.hash]);

  return (
    <header className="dsp-public-header">
      <div className="dsp-public-container dsp-public-header__inner">
        <div className="dsp-public-header__brand">
          <BrandLogo
            className="dsp-public-logo"
            to="/"
            aria-label="DSP Marketplace home"
          />
          {isHome && (
            <span className="ai-brand-caption">
              Driving lessons, connected.
            </span>
          )}
        </div>
        <button
          className="dsp-public-menu-button"
          type="button"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
          aria-controls="dsp-main-navigation"
        >
          <span>{open ? <X size={21} /> : <Menu size={21} />}</span>
        </button>
        <nav
          id="dsp-main-navigation"
          className={`dsp-public-nav ${open ? "is-open" : ""}`}
          aria-label="Main navigation"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              document
                .querySelector<HTMLButtonElement>(".dsp-public-menu-button")
                ?.focus();
            }
          }}
        >
          <div className="dsp-public-nav__links">
            {navigationLinks.map(([label, href]) => {
              const target = location.pathname === "/" ? href : `/${href}`;
              return (
                <a key={label} href={target} onClick={() => setOpen(false)}>
                  {label}
                  {!isHome && <ChevronDown size={13} />}
                </a>
              );
            })}
          </div>
          <div className="dsp-public-nav__actions">
            <NavLink className="dsp-public-nav__signin" to="/auth/signin">
              Sign in
            </NavLink>
            <NavLink
              className="dsp-public-button dsp-public-button--primary dsp-public-button--small"
              to="/auth/signup"
            >
              Join DSP <ArrowUpRight size={15} aria-hidden="true" />
            </NavLink>
          </div>
        </nav>
      </div>
    </header>
  );
}
