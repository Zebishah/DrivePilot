import React from "react";
const Banner: React.FC = () => {
  return (
    <div className="relative w-full min-h-screen">
      {/* Background Image */}
      <img
        src="/images/banner.png"
        alt="Driving Training"
        className="w-full h-full object-cover"
      />

      {/* Overlay Text */}

      {/* Overlay Text */}

      <div className="absolute top-0 left-0 w-full h-full flex flex-col justify-center items-end text-white px-8">
        <div className=" mb-72 mr-52  max-w-xs">
          <img
            src="/images/banner1.png"
            alt="Driving Training"
            style={{
              width: "120px",
              height: "auto",
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default Banner;
