import type React from "react";
import { useNavigate } from "react-router-dom";

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="text-center flex flex-col h-screen justify-center items-center">
      <h1 className="text-primary font-bold text-6xl font-inter mb-2">
        Oops - Page Not Found
      </h1>

      <p className="text-lg text-neutral-600">
        The page you are looking for does not exist.
      </p>
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="bg-primary text-white p-2.5 rounded-md mt-4"
      >
        Go Back
      </button>
      <img
        src="/Assets/web resources/404.png"
        alt="404 illustration"
        className="w-96 mx-auto"
      />
    </div>
  );
};

export default NotFound;
