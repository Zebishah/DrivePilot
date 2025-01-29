
import React, { useEffect, useState } from "react";
import { Banner4Props } from "../../types/public";
import Container from "../common/Container";
import getProportionalHeight from "../../utils/getProportionalHeight";

const Banner4: React.FC<Banner4Props> = ({ header, paragraph }) => {
  const [height, setHeight] = useState(getProportionalHeight(window.innerWidth));

  useEffect(() => {
    const handleResize = () => {
      setHeight(getProportionalHeight(window.innerWidth));
    };

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div
      className={`bg-[url('/images/map.png')] bg-cover md:bg-contain bg-top bg-no-repeat w-full`}
      style={{
        height: window.innerWidth > 769 ? `${getProportionalHeight(window.innerWidth)}px` : "500px",
      }}
    >
      <Container>
        <div className="h-full w-full flex flex-col items-center justify-center text-center gap-5">
          <div className="w-full sm:w-[60%]">
            <h1 className="text-white font-harabara sm:text-4xl lg:text-5xl font-bold mb-3 lg:mb-6">
              {header}
            </h1>
            <p className="text-white font-poppins text-sm lg:text-lg xl:text-xl">
              {paragraph}
            </p>
          </div>
        </div>
      </Container>
    </div>
  );
};

export default Banner4;
