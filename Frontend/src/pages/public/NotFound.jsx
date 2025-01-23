import React from "react";
import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div className="text-center mt-14">
      <h1 className="text-primary font-bold text-2xl font-inter ">
        oops - Page Not Found
      </h1>

      <p>The page you are looking for does not exist.</p>
      <Link to="/" className="text-primary underline">
        Go Back Home
      </Link>
      <img
        src="/Assets/web resources/404.png"
        alt=""
        className="w-96 mx-auto"
      />
    </div>
  );
};

export default NotFound;
