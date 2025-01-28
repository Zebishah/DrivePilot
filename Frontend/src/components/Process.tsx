import React, { useRef, useState, useEffect } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import { Navigation } from "swiper/modules";
import { TbNavigationFilled } from "react-icons/tb";
import type { Swiper as SwiperClass } from "swiper/types"; // Import Swiper type

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
    <div className="flex flex-col items-center py-8 bg-blue-100 relative ">
      <h2 className="text-3xl font-bold mb-6">Our Process</h2>
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
              <div className="flex flex-col md:flex-row items-center">
                {/* Left Side */}
                <div>
                  <img
                    src={step.imageUrl}
                    alt={step.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                {/* Right Side */}
                <div
                  className="p-8 pr-12 text-justify"
                  style={{
                    background: "#5FC2D3",
                    borderRadius: "10px",
                  }}
                >
                  <h3 className="font-bold text-xl text-blue-600">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 mt-2">{step.description}</p>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
        <div
          onClick={handlePrev}
          className={`absolute top-1/3 -left-40 bg-white text-#5FC2D3 w-12 h-12 rounded-full flex items-center justify-center cursor-pointer z-10 ${
            currentIndex === 0 ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          <TbNavigationFilled
            style={{ color: "#5FC2D3", transform: "rotate(270deg)" }}
          />
        </div>
        <div
          onClick={handleNext}
          className={`absolute top-1/3 -right-40 bg-white text-#5FC2D3 w-12 h-12 rounded-full flex items-center justify-center cursor-pointer z-10 ${
            currentIndex === steps.length - 1
              ? "opacity-50 cursor-not-allowed"
              : ""
          }`}
        >
          <TbNavigationFilled
            style={{ color: "#5FC2D3", transform: "rotate(90deg)" }}
          />
        </div>
      </div>
    </div>
  );
};

export default Process;

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
//       "Lorem ipsum dolor sit amet consectetur. Ridiculus mattis dictum ultrices amet. Nulla lectus ut leo amet feugiat tristique vitae. Etiam nulla odio in arcu. Ut libero quam duis arcu nibh lorem sit.",
//     imageUrl: "/images/carousel1.png",
//   },
//   {
//     title: "Yourself",
//     description:
//       "Lorem ipsum dolor sit amet consectetur. Ridiculus mattis dictum ultrices amet. Nulla lectus ut leo amet feugiat tristique vitae. Etiam nulla odio in arcu. Ut libero quam duis arcu nibh lorem sit.",
//     imageUrl: "/images/Carousel2.png",
//   },
//   {
//     title: "hhddddddddddd",
//     description:
//       "Lorem ipsum dolor sit amet consectetur. Ridiculus mattis dictum ultrices amet. Nulla lectus ut leo amet feugiat tristique vitae. Etiam nulla odio in arcu. Ut libero quam duis arcu nibh lorem sit.",
//     imageUrl: "/images/Carousel3.png",
//   },
//   {
//     title: "6666666gggggggggggg",
//     description:
//       "Lorem ipsum dolor sit amet consectetur. Ridiculus mattis dictum ultrices amet. Nulla lectus ut leo amet feugiat tristique vitae. Etiam nulla odio in arcu. Ut libero quam duis arcu nibh lorem sit.",
//     imageUrl: "/images/Carousel4.png",
//   },
// ];

// const Process: React.FC = () => {
//   const swiperRef = useRef<SwiperClass | null>(null);
//   const [currentIndex, setCurrentIndex] = useState(0);

//   useEffect(() => {
//     if (swiperRef.current) {
//       const swiper = swiperRef.current;
//       swiper.on("slideChange", () => {
//         setCurrentIndex(swiper.activeIndex);
//       });
//     }
//   }, []);

//   const handlePrev = () => {
//     if (swiperRef.current) {
//       swiperRef.current.slidePrev();
//     }
//   };

//   const handleNext = () => {
//     if (swiperRef.current) {
//       swiperRef.current.slideNext();
//     }
//   };

//   return (
//     <div className="relative bg-blue-100 overflow-hidden">
//       {/* Top Wave */}
//       <div className="absolute top-0 left-0 w-full overflow-hidden leading-none">
//         <svg
//           className="relative block w-full"
//           viewBox="0 0 1440 120"
//           xmlns="http://www.w3.org/2000/svg"
//         >
//           <path
//             fill="#BFDBFE"
//             d="M0,96L48,106.7C96,117,192,139,288,133.3C384,128,480,96,576,85.3C672,75,768,85,864,96C960,107,1056,117,1152,117.3C1248,117,1344,107,1392,101.3L1440,96L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"
//           ></path>
//         </svg>
//       </div>

//       {/* Content */}
//       <div className="relative flex flex-col items-center py-16 z-10">
//         <h2 className="text-3xl font-bold mb-6">Our Process</h2>
//         <div className="relative w-full max-w-4xl">
//           <Swiper
//             onSwiper={(swiper) => {
//               swiperRef.current = swiper;
//             }}
//             spaceBetween={20}
//             slidesPerView={1}
//             pagination={false} // Disable pagination dots
//             modules={[Navigation]}
//           >
//             {steps.map((step, index) => (
//               <SwiperSlide key={index}>
//                 <div className="flex flex-col md:flex-row items-center">
//                   {/* Left Side */}
//                   <div>
//                     <img
//                       src={step.imageUrl}
//                       alt={step.title}
//                       className="w-full h-full object-cover"
//                     />
//                   </div>
//                   {/* Right Side */}
//                   <div
//                     className="p-8 pr-12 text-justify"
//                     style={{
//                       background: "#5FC2D3",
//                       borderRadius: "10px",
//                     }}
//                   >
//                     <h3 className="font-bold text-xl text-blue-600">
//                       {step.title}
//                     </h3>
//                     <p className="text-gray-600 mt-2">{step.description}</p>
//                   </div>
//                 </div>
//               </SwiperSlide>
//             ))}
//           </Swiper>
//           <div
//             onClick={handlePrev}
//             className={`absolute top-1/3 -left-40 bg-white text-#5FC2D3 w-12 h-12 rounded-full flex items-center justify-center cursor-pointer z-10 ${
//               currentIndex === 0 ? "opacity-50 cursor-not-allowed" : ""
//             }`}
//           >
//             <TbNavigationFilled
//               style={{ color: "#5FC2D3", transform: "rotate(270deg)" }}
//             />
//           </div>
//           <div
//             onClick={handleNext}
//             className={`absolute top-1/3 -right-40 bg-white text-#5FC2D3 w-12 h-12 rounded-full flex items-center justify-center cursor-pointer z-10 ${
//               currentIndex === steps.length - 1
//                 ? "opacity-50 cursor-not-allowed"
//                 : ""
//             }`}
//           >
//             <TbNavigationFilled
//               style={{ color: "#5FC2D3", transform: "rotate(90deg)" }}
//             />
//           </div>
//         </div>
//       </div>

//       {/* Bottom Wave */}
//       <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none">
//         <svg
//           className="relative block w-full"
//           viewBox="0 0 1440 120"
//           xmlns="http://www.w3.org/2000/svg"
//         >
//           <path
//             fill="#BFDBFE"
//             d="M0,32L48,48C96,64,192,96,288,101.3C384,107,480,85,576,64C672,43,768,21,864,26.7C960,32,1056,64,1152,85.3C1248,107,1344,117,1392,122.7L1440,128L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"
//           ></path>
//         </svg>
//       </div>
//     </div>
//   );
// };

// export default Process;
