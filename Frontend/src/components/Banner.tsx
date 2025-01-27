
import React from "react";
import { Button } from "@mui/material";

const Banner: React.FC = () => {
  return (
    // <div className="relative  w-full min-h-screen"> {/* Set container height */}
    //   {/* Background Image */}
    //   <img
    //     src="/images/banner.png" // Path to the image in the public folder
    //     alt="Driving Training"
    //     className="w-full h-full object-cover" // Ensure it covers the full width and height
    //   />
    //   {/* Overlay Text */}
    //   <div className=" absolute top-0 left-0 w-full h-full flex flex-col justify-center items-left text-white">

    //     <h2 className="ml-32  text-4xl font-bold ">Building Skilled Drivers for a Safer Tomorrow.</h2>
    //     <p className=" ml-32  text-center max-w-md">
    //       Lorem ipsum dolor sit amet consectetur. Eu faucibus felis fermentum nunc sit. Suspendisse vivamus ipsum
    //       vestibulum morbi tortor faucibus lacus duis nunc. Vitae at metus sed.
    //     </p>
    //     </div>
    //   </div>

    <div className="relative w-full min-h-screen">
  {/* Background Image */}
  <img
    src="/images/banner.png" // Path to the image in the public folder
    alt="Driving Training"
    className="w-full h-full object-cover" // Ensure it covers the full width and height
  />
  
  {/* Overlay Text */}

  <div className="absolute top-0 left-0 w-full h-full flex flex-col justify-center items-start text-white px-8">

<div className="absolute top-0 left-0 w-full h-full flex flex-col justify-center items-end text-white px-8">
    <div className=" mb-72 mr-52  max-w-xs">
    <img
  src="/images/banner1.png"
  alt="Driving Training"
  style={{
    width: "120px", // Set a fixed width
    height: "auto" // Maintain aspect ratio
  }}
/>
    </div>   
    </div>


    <h2 className="ml-40  text-4xl max-w-md font-bold">Building Skilled Drivers for a Safer Tomorrow.</h2>
    
    <p className="ml-40 mb-72 text-justify max-w-md">
      Lorem ipsum dolor sit amet consectetur. Eu faucibus felis fermentum nunc sit. Suspendisse vivamus ipsum
      vestibulum morbi tortor faucibus lacus duis nunc. Vitae at metus sed.
    </p>
    
  </div>

  </div>
  
  


  );
};

export default Banner;

