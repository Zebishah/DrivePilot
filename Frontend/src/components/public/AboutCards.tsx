import React from "react";

type Props = {
  imageUrl?: string;
  text?: string;
};

const Card: React.FC<Props> = ({ imageUrl, text }) => {
  return (
    <div className="max-w-[300px] sm:w-[285px] md:w-[320px] lg:w-[200px] xl:w-[243px] 2xl:w-[300px] h-[420px] lg:h-[300px]  xl:h-[400px]  2xl:h-[460px]  rounded-t-[80px] overflow-hidden shadow-lg relative">
      <img
        src={imageUrl}
        alt=""
        className="w-full h-full  object-cover object-bottom  "
      />
      <p className="bg-primary flex  items-center justify-center w-full   py-3 font-poppins font-semibold z- absolute bottom-0 ">
        {text}
      </p>
    </div>
  );
};
const AboutCards: React.FC<Props> = ({}) => {
  return (
    <div className="my-12 md:my-24 flex justify-center sm:justify-between flex-wrap gap-6 ">
      <Card imageUrl={"/images/about1.jpeg"} text="safe driving" />
      <Card imageUrl={"/images/about2.jpeg"} text="Experienced Instructor" />
      <Card imageUrl={"/images/about3.jpeg"} text="Advanced search" />
      <Card imageUrl={"/images/about4.jpeg"} text="Inclusive Learning" />

      {/* <Card imageUrl={"/images/about1.png"} text="safe driving" /> */}
    </div>
  );
};

export default AboutCards;
