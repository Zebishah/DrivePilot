import React from "react";
import Banner2 from "../../components/public/Banner2";
import Container from "../../components/common/Container";
import AboutCards from "../../components/public/AboutCards";

type Props = {};

const AboutUs = (props: Props) => {
  return (
    <div>
      <Banner2
        header={"About Us"}
        paragraph={
          "Driving School Platform (DSP) is an innovative digital solution dedicated to modernizing and simplifying driver training in Switzerland. DSP offers a web and mobile platform that puts learner drivers in direct contact with instructors approved by the Federal Roads Ofce (FEDRO), or with private instructors authorized to teach. By introducing DSP to the Swiss market, our ambition is to transform access to driving lessons by facilitating organization and exibility for both students and instructors."
        }
        image={"/images/about.png"}
      />
      <Container>
        <AboutCards />
        <div className="flex flex-col items-center  justify-center  mb-12 md:mb-24 ">
          <h1 className="font-harabara font-bold text-3xl mx-auto mb-10 text-center">
            MEET THE FOUNDERS OF DRIVING SCHOOL
          </h1>
          <div className="flex flex-col  lg:flex-row w-full xl:w-[90%] lg:items-center   lg:justify-around gap-5">
            <div className="  lg:w-[45%]  ">
              <div className="pl-6 border-l-8 border-black">
                <h4 className="font-poppins font-semibold  text-xl  lg:text-2xl xl:text-[28px] text-primary">
                  lOREM IPSUM
                </h4>
                <p className="font-poppins font-semibold text-base xl:text-lg text-black">
                  Driving School Platform
                </p>
              </div>
              <div className="sm:w-[420px] sm:h-[420px] aspect-square w-full h-[calc()] mt-2 border-r-8 border-b-8 border-black ">
                <div className="sm:w-[404px] sm:h-[404px]  w-full h-full  bg-primary flex items-center justify-center sm:justify-end">
                  <img src="/images/ceo.png" alt="" className=" p-4 sm:p-0" />
                </div>
              </div>
            </div>
            <div className=" lg:w-[45%] 2xl:mr-20">
              <h1 className="font-poppins font-semibold text-xl  lg:text-2xl xl:text-[28px] 2xl:text-[32px] text-primary">
                Lorem ipsum TYVBDC GIU SEFD BFDVB
              </h1>
              <p className="font-poppins font-normal  text-base 2xl:text-xl">
                As the visionary leader behind our platform, lorem ipsum brings
                a wealth of experience and a commitment to driving innovation in
                industry. With a deep passion for creating accessible, inclusive
                solutions, lorem ipsum is dedicated to shaping the future of
                education and technology. Under their leadership, our platform
                has grown into a trusted hub for specific services, empowering
                users to reach their full potential. Through a combination of
                strategic thinking and hands-on expertise, lorem ipsum continues
                to inspire excellence and transformation across the company.
              </p>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
};

export default AboutUs;
