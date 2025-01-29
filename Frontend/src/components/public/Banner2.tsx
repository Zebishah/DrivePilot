import React, { useEffect, useState } from "react";
import { Banner2Props } from "../../types/public";
import Container from "../common/Container";
import getProportionalHeight from "../../utils/getProportionalHeight";

const Banner2: React.FC<Banner2Props> = ({ header, paragraph, image }) => {
  const [height, setHeight] = useState(
    getProportionalHeight(window.innerWidth)
  );

  useEffect(() => {
    const handleResize = () => {
      setHeight(getProportionalHeight(window.innerWidth));
    };

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);
  console.log(height);

  // h-[400px] lg:h-[500px]  xl:h-[660px] 2xl:h-[880px]
  return (
    <div
      className={`bg-[url('/images/about-banner.jpeg')] md:bg-contain bg-top bg-no-repeat  w-full  `}
      style={{
        height:
          window.innerWidth > 769
            ? `${getProportionalHeight(window.innerWidth)}px`
            : "500px",
      }}
    >
      <Container>
        <div className=" h-full  w-full  flex sm:items-center sm:justify-between justify-center gap-5 flex-col sm:flex-row  ">
          <div className=" w-full sm:w-[60%]">
            <h1 className=" text-white font-harabara sm:text-4xl lg:text-5xl  font-bold mb-3 lg:mb-6 text-center sm:text-left ">
              {header}
            </h1>
            <p className="sm:text-left text-white  font-poppins  text-sm lg:text-lg  xl:text-xl  text-center  ">
              {paragraph}
            </p>
          </div>
          <div className="w-full sm:w-[30%] flex  items-center justify-center ">
            <img
              src={image}
              alt="Driving Training"
              style={{
                width: "120px",
                height: "auto",
              }}
            />
          </div>
        </div>
      </Container>
    </div>
  );
};

export default Banner2;
