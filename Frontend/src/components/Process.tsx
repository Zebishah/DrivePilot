// import React, { useRef, useState, useEffect } from "react";
// import { Swiper, SwiperSlide } from "swiper/react";
// import "swiper/css";
// import "swiper/css/navigation";
// import { Navigation } from "swiper/modules";
// import { TbNavigationFilled } from "react-icons/tb";
// import type { Swiper as SwiperClass } from "swiper/types";

// interface Step {
//   title: string;
//   description: string;
//   imageUrl: string;
// }

// const steps: Step[] = [
//   {
//     title: "Register Yourself",
//     description:
//       "Lorem ipsum dolor sit amet consectetur. Ridiculus mattis dictum ultrices amet. Nulla lectus ut leo amet feugiat tristique vitae.",
//     imageUrl: "/images/carousel1.png",
//   },
//   {
//     title: "Complete Your Profile",
//     description:
//       "Lorem ipsum dolor sit amet consectetur. Ridiculus mattis dictum ultrices amet. Nulla lectus ut leo amet feugiat tristique vitae.",
//     imageUrl: "/images/Carousel2.png",
//   },
//   {
//     title: "Start Exploring",
//     description:
//       "Lorem ipsum dolor sit amet consectetur. Ridiculus mattis dictum ultrices amet. Nulla lectus ut leo amet feugiat tristique vitae.",
//     imageUrl: "/images/Carousel3.png",
//   },
//   {
//     title: "Achieve Your Goals",
//     description:
//       "Lorem ipsum dolor sit amet consectetur. Ridiculus mattis dictum ultrices amet. Nulla lectus ut leo amet feugiat tristique vitae.",
//     imageUrl: "/images/Carousel4.png",
//   },
// ];

// const Process: React.FC = () => {
//   const swiperRef = useRef<SwiperClass | null>(null);
//   const [currentIndex, setCurrentIndex] = useState(0);

//   useEffect(() => {
//     if (swiperRef.current) {
//       swiperRef.current.on("slideChange", () => {
//         setCurrentIndex(swiperRef.current!.activeIndex);
//       });
//     }
//   }, []);

//   const handlePrev = () => swiperRef.current?.slidePrev();
//   const handleNext = () => swiperRef.current?.slideNext();

//   return (
//     <div className="flex justify-center items-center min-h-screen relative bg-[url('/images/process.png')] bg-no-repeat bg-cover bg-center p-6">
//       <div className="text-center w-full max-w-7xl mx-auto">
//         <h2 className="text-3xl font-bold mb-6">Our Process</h2>

//         <div className="relative w-full px-4 sm:px-10 md:px-16 lg:px-20">
//           <Swiper
//             onSwiper={(swiper) => (swiperRef.current = swiper)}
//             spaceBetween={20}
//             slidesPerView={1}
//             pagination={false}
//             modules={[Navigation]}
//           >
//             {steps.map((step, index) => (
//               <SwiperSlide key={index} className="w-full">
//                 <div className="flex flex-col md:flex-row items-center gap-6">
//                   {/* Left Side (Image) */}
//                   <div className="w-full md:w-1/2 flex justify-center">
//                     <img
//                       src={step.imageUrl}
//                       alt={step.title}
//                       className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg object-contain"
//                     />
//                   </div>

//                   {/* Right Side (Text) */}
//                   <div className="w-full md:w-1/2 bg-primary p-6 md:p-8 rounded-lg shadow-lg !z-0">
//                     <h3 className="font-medium text-xl border-l-4 border-black pl-4">
//                       {step.title}
//                     </h3>
//                     <p className="mt-2 text-gray-700">{step.description}</p>
//                   </div>
//                 </div>
//               </SwiperSlide>
//             ))}
//           </Swiper>

//           {/* Navigation Buttons */}
//           <button
//             onClick={handlePrev}
//             className="absolute top-1/2 left-2 sm:left-4 md:left-8 transform -translate-y-1/2 bg-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg z-10"
//           >
//             <TbNavigationFilled className="text-[#5FC2D3] rotate-[-90deg] text-2xl" />
//           </button>

//           <button
//             onClick={handleNext}
//             className="absolute top-1/2 right-2 sm:right-4 md:right-8 transform -translate-y-1/2 bg-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg z-10"
//           >
//             <TbNavigationFilled className="text-primary rotate-90 text-2xl  " />
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Process;

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
      "Lorem ipsum dolor sit amet consectetur. Ridiculus mattis dictum ultrices amet. Nulla lectus ut leo amet feugiat tristique vitae.",
    imageUrl: "/images/carousel1.png",
  },
  {
    title: "Complete Your Profile",
    description:
      "Lorem ipsum dolor sit amet consectetur. Ridiculus mattis dictum ultrices amet. Nulla lectus ut leo amet feugiat tristique vitae.",
    imageUrl: "/images/Carousel2.png",
  },
  {
    title: "Start Exploring",
    description:
      "Lorem ipsum dolor sit amet consectetur. Ridiculus mattis dictum ultrices amet. Nulla lectus ut leo amet feugiat tristique vitae.",
    imageUrl: "/images/Carousel3.png",
  },
  {
    title: "Achieve Your Goals",
    description:
      "Lorem ipsum dolor sit amet consectetur. Ridiculus mattis dictum ultrices amet. Nulla lectus ut leo amet feugiat tristique vitae.",
    imageUrl: "/images/Carousel4.png",
  },
];

const Process: React.FC = () => {
  const swiperRef = useRef<SwiperClass | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (swiperRef.current) {
      swiperRef.current.on("slideChange", () => {
        setCurrentIndex(swiperRef.current!.activeIndex);
      });
    }
  }, []);

  const handlePrev = () => swiperRef.current?.slidePrev();
  const handleNext = () => swiperRef.current?.slideNext();

  return (
    <div className="flex justify-center items-center h-screen sm:h-[70vh] lg:min-h-[80vh] relative bg-[url('/images/process.png')] bg-no-repeat bg-cover bg-center p-6">
      <div className="w-full max-w-7xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-6">Our Process</h2>

        <div className="relative w-full px-4 sm:px-10 md:px-16 lg:px-20">
          <Swiper
            onSwiper={(swiper) => (swiperRef.current = swiper)}
            spaceBetween={20}
            slidesPerView={1}
            pagination={false}
            modules={[Navigation]}
          >
            {steps.map((step, index) => (
              <SwiperSlide
                key={index}
                className="flex justify-center items-center"
              >
                <div className="flex flex-col md:flex-row items-center gap-6 max-w-3xl mx-auto xxl:w-[1440px]">
                  {/* Left Side (Image) */}
                  <div className="w-full md:w-1/2 flex justify-center">
                    <img
                      src={step.imageUrl}
                      alt={step.title}
                      className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg object-contain"
                    />
                  </div>

                  {/* Right Side (Text) */}
                  <div className="w-full md:w-1/2 bg-primary p-6 md:p-8 rounded-lg shadow-lg ">
                    <h3 className="font-medium text-xl border-l-4 border-black pl-4">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-gray-700">{step.description}</p>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>

          {/* Navigation Buttons */}
          <button
            onClick={handlePrev}
            className="absolute top-1/2 left-2 sm:left-4 md:left-8 transform -translate-y-1/2 bg-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg z-10"
          >
            <TbNavigationFilled className="text-[#5FC2D3] rotate-[-90deg] text-2xl" />
          </button>

          <button
            onClick={handleNext}
            className="absolute top-1/2 right-2 sm:right-4 md:right-8 transform -translate-y-1/2 bg-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg z-10"
          >
            <TbNavigationFilled className="text-primary rotate-90 text-2xl" />
          </button>
          <div className="mt-6 text-center text-secondary font-semibold">
            Step {currentIndex + 1} of {steps.length}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Process;
