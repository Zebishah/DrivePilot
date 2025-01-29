import React, { useEffect, useState } from "react";
import { Banner3Props } from "../../types/public";
import Container from "../common/Container";
import getProportionalHeight1 from "../../utils/getProportionalHeight1";

const Banner3: React.FC<Banner3Props> = ({ header, paragraph, image }) => {
  const [height, setHeight] = useState(
    getProportionalHeight1(window.innerWidth)
  );

  useEffect(() => {
    const handleResize = () => {
      setHeight(getProportionalHeight1(window.innerWidth));
    };

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);
  console.log(height);

  // h-[400px] lg:h-[500px]  xl:h-[660px] 2xl:h-[880px]
  return (
    <div
      className={`bg-[url('/images/banner.png')] md:bg-contain bg-top bg-no-repeat  w-full  `}
      style={{
        height:
          window.innerWidth > 769
            ? `${getProportionalHeight1(window.innerWidth)}px`
            : "500px",
      }}
    >
      <Container>
        <div className="h-full w-full flex flex-col sm:flex-row sm:items-center pb-32 sm:justify-between justify-center gap-5 ">
          <div className=" w-full sm:w-[60%]">
            <h1 className=" text-white  font-harabara sm:text-4xl lg:text-5xl  font-bold mb-3 lg:mb-6  text-center sm:text-left ">
              {header}
            </h1>
            <p className="sm:text-left text-white   font-poppins  text-sm lg:text-lg  xl:text-xl  text-center  ">
              {paragraph}
            </p>
          </div>
          <div className="w-full sm:w-[30%] flex  items-center justify-center ">
            <img
              src={image}
              alt="Banner"
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

export default Banner3;
