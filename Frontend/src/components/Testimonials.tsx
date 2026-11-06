import React from "react";
import {
  Container,
  Grid,
  Card,
  CardContent,
  Avatar,
  Typography,
} from "@mui/material";

const testimonials = [
  {
    name: "Shaun Cobb",
    text: "Lorem ipsum dolor sit amet consectetur. Ultricies sed id nulla ornare. Arcu nunc tincidunt cursus convallis diam tortor.",
    image: "/images/img.png",
  },
  {
    name: "Shaun Cobb",
    text: "Lorem ipsum dolor sit amet consectetur. Ultricies sed id nulla ornare. Arcu nunc tincidunt cursus convallis diam tortor.",
    image: "/images/img.png",
    highlighted: true,
  },
  {
    name: "Shaun Cobb",
    text: "Lorem ipsum dolor sit amet consectetur. Ultricies sed id nulla ornare. Arcu nunc tincidunt cursus convallis diam tortor.",
    image: "/images/img.png",
  },
];

const Testimonials: React.FC = () => {
  return (
     <Container style={{ textAlign: "center", padding: "2rem 0",
    }}>
    <h4 className="mt-4 text-3xl font-bold font-harabara">
      Testimonials
    </h4>
    <p className="mt-2 text-base">
      Lorem ipsum dolor sit amet consectetur. Ultricies sed id nulla ornare.
    </p>
    <p className="mb-8 text-base">
      Arcu nunc tincidunt cursus convallis diam
    </p>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-center">
      {testimonials.map((testimonial, index) => (
        <div
          key={index}
          className={`p-2 min-h-[400px] rounded-lg shadow-md ${
            testimonial.highlighted ? 'bg-[#5FC2D3]' : 'bg-white border border-gray-600'
          }`}
          style={
            testimonial.highlighted
              ? { marginTop: "3rem" }
              : { marginBottom: "3rem" }
          }
        >
          <div className="text-center p-2 ">
            <img
              src={testimonial.image}
              alt={testimonial.name}
              className="w-36 h-36 rounded-full mt-4 mx-auto mb-4 border-2"
              style={{
                borderColor: testimonial.highlighted ? 'white' : '#114C5A',
              }}
            />
            <h6
              className={`text-3xl font-bold mb-4 ${
                testimonial.highlighted ? 'text-black' : 'text-[#5FC2D3]'
              }`}
            >
              {testimonial.name}
            </h6>
            <p className="text-base font-normal text-xl">
              {testimonial.text}
            </p>
          </div>
        </div>
      ))}
    </div>
  </Container>
  );
};

export default Testimonials;
