
import React, { useState } from "react";
import { NavLink,useLocation } from "react-router-dom";
import { Button } from "@mui/material";
import { FaBars, FaTimes } from "react-icons/fa"; 
const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

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
        <img src="/dsp.png" alt="Logo" className="h-10 w-auto md:ml-8" />
      </div>

      {/* Hamburger Menu Icon */}
      <div className="md:hidden" onClick={toggleMenu}>
        {isMenuOpen ? (
          <FaTimes className="h-6 w-6 cursor-pointer" />
        ) : (
          <FaBars className="h-6 w-6 cursor-pointer" />
        )}
      </div>

      {/* Links Section */}
      <ul
        className={`flex flex-col p-6 md:p-4 md:flex-row space-y-6 md:space-y-0 md:space-x-6 absolute md:relative top-14 md:top-auto left-0 w-full md:w-auto bg-gray-900 md:bg-transparent transition-all duration-300 ease-in-out ${
          isMenuOpen ? "block" : "hidden md:flex"
        }`}
      >
        <li>
          <NavLink
            to="/"
            className={({ isActive }) =>
              isActive ? "text-blue-400" : "hover:text-gray-300"
            }
          >
            Home
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/about"
            className={({ isActive }) =>
              isActive ? "text-blue-400" : "hover:text-gray-300"
            }
          >
            About Us
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/contact"
            className={({ isActive }) =>
              isActive ? "text-blue-400" : "hover:text-gray-300"
            }
          >
            Contact Us
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/professional"
            className={({ isActive }) =>
              isActive ? "text-blue-400" : "hover:text-gray-300"
            }
          >
            Our Instructors
          </NavLink>
        </li>
      </ul>

      {/* Button Section */}
      <div className="hidden md:block mr-8">
        <Button
          variant="contained"
          sx={{
            paddingLeft: "2rem",
            paddingRight: "2rem",
            borderRadius: "10px",
            backgroundColor: "#58B4AE",
            "&:hover": { backgroundColor: "#479A93" },
            textTransform: "none",
            color: "#000",
            fontFamily: 'Poppins, sans-serif',
          }}
        >
          Sign In
        </Button>
      </div>
    </nav>
  );
};

export default Navbar;









