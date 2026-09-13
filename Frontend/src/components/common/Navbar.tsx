import React, { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@mui/material";
import { FaBars, FaTimes } from "react-icons/fa";
const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  React.useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  return (
    <nav className="bg-gray-900 font-poppins text-white py-4 px-6 flex justify-between items-center relative">
      {/* Logo Section */}
      <div className="flex items-center">
        <img
          src="/darkbluelogo.png"
          alt="Logo"
          className="h-10 w-auto md:ml-8"
        />
      </div>

      {/* Hamburger Menu Icon */}
      <button
        type="button"
        className="md:hidden rounded-md p-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        onClick={toggleMenu}
        aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={isMenuOpen}
        aria-controls="public-navigation"
      >
        {isMenuOpen ? (
          <FaTimes className="h-6 w-6" aria-hidden="true" />
        ) : (
          <FaBars className="h-6 w-6" aria-hidden="true" />
        )}
      </button>

      {/* Links Section */}
      <ul
        id="public-navigation"
        className={`flex flex-col p-6 md:p-4 md:flex-row space-y-6 md:space-y-0 md:space-x-6 absolute md:relative top-14 md:top-auto left-0 w-full md:w-auto bg-gray-900 md:bg-transparent transition-all duration-300 ease-in-out ${
          isMenuOpen ? "block" : "hidden md:flex"
        }`}
      >
        <li>
          <NavLink
            to="/"
            className={({ isActive }) =>
              isActive ? "text-primary" : "hover:text-gray-300"
            }
          >
            Home
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/about"
            className={({ isActive }) =>
              isActive ? "text-primary" : "hover:text-gray-300"
            }
          >
            About Us
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/contact"
            className={({ isActive }) =>
              isActive ? "text-primary" : "hover:text-gray-300"
            }
          >
            Contact Us
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/professional"
            className={({ isActive }) =>
              isActive ? "text-primary" : "hover:text-gray-300"
            }
          >
            Our Instructors
          </NavLink>
        </li>
        <li className="block md:hidden w-full">
          <Button
            onClick={() => {
              navigate("/auth/signin");
            }}
            variant="contained"
            sx={{
              paddingLeft: "2rem",
              paddingRight: "2rem",
              borderRadius: "10px",
              backgroundColor: "#5EC2D2",
              "&:hover": { backgroundColor: "#479A93" },
              textTransform: "none",
              color: "#000",
              fontFamily: "Poppins, sans-serif",
            }}
          >
            Sign In
          </Button>
        </li>
      </ul>

      {/* Button Section */}
      <div className="hidden md:block mr-8">
        <Button
          onClick={() => {
            navigate("/auth/signin");
          }}
          variant="contained"
          sx={{
            paddingLeft: "2rem",
            paddingRight: "2rem",
            borderRadius: "10px",
            backgroundColor: "#5EC2D2",
            "&:hover": { backgroundColor: "#479A93" },
            textTransform: "none",
            color: "#000",
            fontFamily: "Poppins, sans-serif",
          }}
        >
          Sign In
        </Button>
      </div>
    </nav>
  );
};

export default Navbar;
