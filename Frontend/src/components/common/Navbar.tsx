import React from "react";
import { NavLink } from "react-router-dom"; // Import NavLink from react-router-dom
import { Button } from "@mui/material";

const Navbar: React.FC = () => {
  return (
    <nav className="bg-gray-900 font-poppins text-white py-4 px-6 flex justify-between items-center">
      {/* Logo Section */}
      <div className="flex items-center">
        <img src="/dsp.png" alt="Logo" className="h-10 w-auto ml-8" />
      </div>

      {/* Links Section */}
      <ul className="flex space-x-6">
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
      <div className="mr-8">
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
             fontFamily: 'Poppins, sans-serif'
           
          }}
        >
          Sign In
        </Button>
      </div>
    </nav>
  );
};

export default Navbar;
