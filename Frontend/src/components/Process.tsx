
import React, { useRef, useState, useEffect } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import { Navigation } from "swiper/modules";
import { TbNavigationFilled } from "react-icons/tb";
import type { Swiper as SwiperClass } from "swiper/types"; 

interface Step {
  title: string;
  description: string;
  imageUrl: string;
}

const steps: Step[] = [
  {
    title: "Register Yourself",
    description:
      "Lorem ipsum dolor sit amet consectetur. Ridiculus mattis dictum ultrices amet. Nulla lectus ut leo amet feugiat tristique vitae. Etiam nulla odio in arcu. Ut libero quam duis arcu nibh lorem sit.",
    imageUrl: "/images/carousel1.png",
  },
  {
    title: "Yourself",
    description:
      "Lorem ipsum dolor sit amet consectetur. Ridiculus mattis dictum ultrices amet. Nulla lectus ut leo amet feugiat tristique vitae. Etiam nulla odio in arcu. Ut libero quam duis arcu nibh lorem sit.",
    imageUrl: "/images/Carousel2.png",
  },
  {
    title: "hdd",
    description:
      "Lorem ipsum dolor sit amet consectetur. Ridiculus mattis dictum ultrices amet. Nulla lectus ut leo amet feugiat tristique vitae. Etiam nulla odio in arcu. Ut libero quam duis arcu nibh lorem sit.",
    imageUrl: "/images/Carousel3.png",
  },
  {
    title: "6g",
    description:
      "Lorem ipsum dolor sit amet consectetur. Ridiculus mattis dictum ultrices amet. Nulla lectus ut leo amet feugiat tristique vitae. Etiam nulla odio in arcu. Ut libero quam duis arcu nibh lorem sit.",
    imageUrl: "/images/Carousel4.png",
  },
];

const Process: React.FC = () => {
  const swiperRef = useRef<SwiperClass | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (swiperRef.current) {
      const swiper = swiperRef.current;
      swiper.on("slideChange", () => {
        setCurrentIndex(swiper.activeIndex);
      });
    }
  }, []);

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
      className="flex flex-col items-center py-8 relative bg-no-repeat p-6 bg-contain bg-center"
      style={{ backgroundImage: "url(/images/process.png)" }}
    >
      <h2 className="text-3xl font-harabara font-bold mb-6">Our Process</h2>
      <div className="relative w-full max-w-4xl">
        <Swiper
          onSwiper={(swiper) => {
            swiperRef.current = swiper;
          }}
          spaceBetween={20}
          slidesPerView={1}
          pagination={false} // Disable pagination dots
          modules={[Navigation]}
        >
          {steps.map((step, index) => (
            <SwiperSlide key={index}>
              <div className="flex gap-12 flex-col md:flex-row items-center">
                {/* Left Side */}
                <div className="w-full md:w-1/2 ">
                  <img
                    src={step.imageUrl}
                    alt={step.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                {/* Right Side */}
                <div
                  className="p-8 pr-12 text-justify w-full md:w-1/2"
                  style={{
                    background: "#5FC2D3",
                    borderRadius: "10px",
                  }}
                >
                  <h3 className="font-poppins font-medium text-xl pl-4 border-l-2 border-black">
                    {step.title}
                  </h3>
                  <p className="font-poppins mt-2">{step.description}</p>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
        <div
          onClick={handlePrev}
          className="absolute top-1/3 -left-10 md:-left-20 bg-white text-#5FC2D3 w-12 h-12 rounded-full flex items-center justify-center cursor-pointer z-10"
        >
          <TbNavigationFilled
            style={{
              color: "#5FC2D3",
              transform: "rotate(270deg)",
              fontSize: "2rem",
            }}
          />
        </div>
        <div
          onClick={handleNext}
          className="absolute top-1/3 -right-10 md:-right-20 bg-white text-#5FC2D3 w-12 h-12 rounded-full flex items-center justify-center cursor-pointer z-10"
        >
          <TbNavigationFilled
            style={{
              color: "#5FC2D3",
              transform: "rotate(90deg)",
              fontSize: "2rem",
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default Process;