
import React from "react";
import { Instagram, Twitter } from "@mui/icons-material";
import { Button } from "@mui/material";
import { FaFacebookF, FaLinkedinIn } from "react-icons/fa";

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 font-poppins text-white px-8 py-8 flex flex-col md:flex-row items-center justify-between mt-8">
      {/* Left Section: Logo */}
      <div className="flex items-center  md:mt-24">
        <img src="/dsp.png" alt="Logo" className="h-20 w-auto" />
      </div>

      {/* Center Section: Links and Description */}
      <div className="flex flex-col items-center mb-8 md:mb- md:mt-0 text-center md:text-left">
        {/* Links */}
        <ul className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-8 mb-6">
          <li>
            <a href="/" className="hover:text-gray-300">
              Home
            </a>
          </li>
          <li>
            <a href="/about" className="hover:text-gray-300">
              About Us
            </a>
          </li>
          <li>
            <a href="/contact" className="hover:text-gray-300">
              Contact Us
            </a>
          </li>
          <li>
            <a href="/professional" className="hover:text-gray-300">
              Our Instructors
            </a>
          </li>
        </ul>

        {/* Contact Information */}
        <p className="mb-4">Email: support@DSP.co</p>

        {/* Social Media Icons */}
        <div className="flex space-x-6">
          <a href="https://www.instagram.com" target="_blank" rel="noopener noreferrer">
            <Instagram sx={{ fontSize: 32, color: "#E1306C" }} />
          </a>
          <a href="https://www.linkedin.com" target="_blank" rel="noopener noreferrer">
            <FaLinkedinIn style={{ fontSize: 32 }} />
          </a>
          <a href="https://www.facebook.com" target="_blank" rel="noopener noreferrer">
            <FaFacebookF style={{ fontSize: 32 }} />
          </a>
          <a href="https://www.twitter.com" target="_blank" rel="noopener noreferrer">
            <Twitter sx={{ fontSize: 32, color: "#1DA1F2" }} />
          </a>
        </div>
      </div>

      {/* Right Section: Sign In Button */}
      <div className="flex items-center  md:mt-32 md:mb-0">
        <Button
          variant="contained"
          sx={{
            backgroundColor: "#58B4AE",
            color: "#000",
            textTransform: "none",
            paddingLeft: "2.75rem",
            paddingRight: "2.75rem",
            paddingTop: "0.5rem",
            paddingBottom: "0.5rem",
            borderRadius: "10px",
            "&:hover": { backgroundColor: "#479A93" },
            fontFamily: "Poppins, sans-serif",
          }}
        >
          Sign In
        </Button>
      </div>
    </footer>
  );
};

export default Footer;
