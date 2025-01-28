import React from "react";
import { Banner2Props } from "../../types/public";
import Container from "../common/Container";

const Banner2: React.FC<Banner2Props> = ({ header, paragraph, image }) => {
  return (
    <div className="bg-[url('/images/about-banner.jpeg')]  bg-cover bg-center h-[650px] ">
      <Container>
        <div className=" h-full  w-full  flex sm:items-center sm:justify-between justify-center gap-5 flex-col sm:flex-row ">
          <div className=" w-full sm:w-[60%]">
            <h1 className=" text-white text-5xl  font-bold mb-6 text-center sm:text-left ">
              {header}
            </h1>
            <p className="sm:text-left text-white  font-poppins  lg:text-lg  xl:text-xl  text-center ">
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
