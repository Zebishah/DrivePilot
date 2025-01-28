
import React, { useRef, useState } from "react";
import { Button } from "@mui/material";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import { Navigation } from "swiper/modules";
import { MdNavigateBefore, MdNavigateNext } from "react-icons/md";
import type { Swiper as SwiperClass } from "swiper/types"; // Import Swiper type
import { FaBook, FaCar, FaCogs, FaMoneyBillWave } from 'react-icons/fa';

const steps = [
  {
    title: "Register Yourself",
    description:
      "Lorem ipsum dolor sit amet consectetur. Ultricies sed id nulla ornare. Arcu nunc tincidunt cursus convallis diam tortor.",
    imageUrl: "/images/Instructor1.png",
    name: "Seb Goldin",
    location: "Houston, UK",
    details: {
      degree: "Bachelor in Driving",
      car: "Suzuki Alto",
      type: "Manual Car",
      rate: "$50/hr",
    },
  },
  {
    title: "Yourself",
    description:
      "Lorem ipsum dolor sit amet consectetur. Ultricies sed id nulla ornare. Arcu nunc tincidunt cursus convallis diam tortor.",
    imageUrl: "/images/Instructor1.png",
    name: "John Doe",
    location: "New York, USA",
    details: {
      degree: "Master in Driving",
      car: "Honda Civic",
      type: "Automatic Car",
      rate: "$60/hr",
    },
  },
  {
    title: "sdfghjukol",
    description:
      "Lorem ipsum dolor sit amet consectetur. Ultricies sed id nulla ornare. Arcu nunc tincidunt cursus convallis diam tortor.",
    imageUrl: "/images/Instructor1.png",
    name: "Jane Smith",
    location: "Los Angeles, USA",
    details: {
      degree: "PhD in Driving",
      car: "Toyota Corolla",
      type: "Manual Car",
      rate: "$55/hr",
    },
  },
  {
    title: "dfghjkl",
    description:
      "Lorem ipsum dolor sit amet consectetur. Ultricies sed id nulla ornare. Arcu nunc tincidunt cursus convallis diam tortor.",
    imageUrl: "/images/Instructor1.png",
    name: "Mike Johnson",
    location: "Chicago, USA",
    details: {
      degree: "Bachelor in Driving",
      car: "Ford Focus",
      type: "Automatic Car",
      rate: "$65/hr",
    },
  },
  // Add more steps as needed
];

const Instructor = () => {
  const swiperRef = useRef<SwiperClass | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePrev = () => {
    if (swiperRef.current) {
      swiperRef.current.slidePrev();
    }
  };

  const handleNext = () => {
    if (swiperRef.current) {
      swiperRef.current.slideNext();
    }
  };

  return (
    <div
      className="flex flex-col items-center p-6 bg-cover bg-center relative"
      style={{ backgroundImage: "url(/images/background.png)" }}
    >
      {/* Overlay for opacity */}
      <div className="absolute inset-0 bg-black opacity-50 z-0"></div>

      {/* Content */}
      <div className="z-10 w-full">
        {/* Header Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4 mt-8 text-white">Our Professional Instructors</h1>
          <p className="text-gray-300 text-lg">
            Lorem ipsum dolor sit amet consectetur. Ultricies sed id nulla ornare.</p>
            <p className="text-gray-300 text-lg"> Arcu nunc tincidunt cursus convallis diam tortor.
          </p>
        </div>

        {/* Swiper Slider */}
        <Swiper
          ref={swiperRef}
          onSwiper={(swiper) => {
            swiperRef.current = swiper;
            swiper.on('slideChange', () => {
              setCurrentIndex(swiper.activeIndex);
            });
          }}
          spaceBetween={20}
          slidesPerView={1}
          breakpoints={{
            768: { slidesPerView: 2 }, // Display 2 slides per view on screens wider than 768px
          }}
          className="max-w-5xl"
          modules={[Navigation]}
        >
          {steps.map((step, index) => (

<SwiperSlide key={index}>
  <div className="p-4 mt-24 bg-white rounded-lg flex flex-col md:flex-row items-center md:items-start text-left ">
    {/* Left Side */}
    <div className="flex flex-col items-center md:items-start md:w-1/3">
      <img
        src={step.imageUrl}
        alt="Instructor"
        className="w-24 h-24 rounded-full mb-4 object-cover"
      />
      <h2 className="text-lg font-bold">{step.name}</h2>
      <p className="text-gray-500">{step.location}</p>
    </div>
    {/* Right Side */}
  
    <div className=" w-full  p-6">
  <div className="text-left">
    <p className="flex items-center gap-2 mb-2">
      <FaBook /> {step.details.degree}
    </p>
    <p className="flex items-center gap-2 mb-2">
      <FaCar /> {step.details.car}
    </p>
    <p className="flex items-center gap-2 mb-2">
      <FaCogs /> {step.details.type}
    </p>
    <p className="flex items-center gap-2">
      <FaMoneyBillWave /> {step.details.rate}
    </p>
  </div>
  <Button
    variant="contained"
    className="w-3"
    style={{
      backgroundColor: "#5FC2D3",
      borderRadius: "10px",
      marginTop: "2rem",
      width: "100%", // Adjust the button width
    }}
  >
    View Details
  </Button>
</div>
  </div>
</SwiperSlide>




          ))}
        </Swiper>

        {/* Slider Navigation */}
        <div className="mt-44 flex justify-center gap-2">
          <button
            onClick={handlePrev}
            className={`p-2 bg-gray-200 rounded ${currentIndex === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
            disabled={currentIndex === 0}
          >
            <MdNavigateBefore size={24} />
          </button>
          <button
            onClick={handleNext}
            className={`p-2 bg-gray-200 rounded ${currentIndex === steps.length - 2 ? "opacity-50 cursor-not-allowed" : ""}`}
            disabled={currentIndex === steps.length - 2}
          >
            <MdNavigateNext size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Instructor;