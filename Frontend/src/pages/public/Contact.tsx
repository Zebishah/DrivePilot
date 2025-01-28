import React from "react";
import Banner2 from "../../components/public/Banner2";
import Container from "../../components/common/Container";
import { Phone, MapPin, Mail } from "lucide-react";
import MapComponent from "./map/ContactMap";

type Props = {};

const Contact: React.FC<Props> = () => {
  return (
    <div>
      <Banner2
        header={"Contact Us"}
        paragraph={
          "Driving School Platform (DSP) is an innovative digital solution dedicated to modernizing and simplifying driver training"
        }
        image="images/contact.png"
      />
      <Container>
        <div className="flex flex-col  lg:flex-row w-full xl:w-[100%] lg:items-center  lg:justify-between gap-20  my-12 md:my-24 ">
          <div className="  lg:w-[50%] sm:px-10 md:px-20 lg:px-5 xl:px-20 h-[400px] w-full ">
            <h2 className=" font-harabara text-[28px] font-bold mb-4">
              Send us message now
            </h2>
            <form className="space-y-4">
              <input
                type="text"
                placeholder="Name"
                className="w-full p-3 border-input border px-[22px] py-[13px]  rounded-[10px] placeholder:text-input focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <input
                type="text"
                placeholder="Phone Number"
                className="w-full p-3 border-input border px-[22px] py-[13px]  rounded-[10px] placeholder:text-input focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <textarea
                placeholder="Message"
                className="w-full p-3 border-input border px-[22px] py-[13px]  rounded-[10px] placeholder:text-input focus:outline-none focus:ring-2 focus:ring-primary"
              ></textarea>
              <select className="w-full p-3 border-input border px-[22px] py-[13px]  rounded-[10px] placeholder:text-input focus:outline-none focus:ring-2 focus:ring-primary">
                <option>Select City</option>
                <option>New York</option>
                <option>Los Angeles</option>
                <option>Chicago</option>
                <option>Houston</option>
              </select>
              <button
                type="submit"
                className="w-full bg-primary py-[16px] text-black font-medium  text-lg p-3 rounded-md hover:bg-blue-400 transition"
              >
                Submit
              </button>
            </form>
          </div>
          <div className=" lg:w-[50%] sm:px-10  md:px-20 lg:px-5 xl:px-20 min-h-[400px] w-full ">
            <div className="space-y-6">
              {/* Phone Number Section */}
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100">
                  <Phone className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium font-poppins text-black">
                    Phone Number
                  </h3>
                  <p className="text-base font-poppins">+924565745674567654</p>
                </div>
              </div>

              {/* Location Section */}
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100">
                  <MapPin className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium font-poppins text-black">
                    Location
                  </h3>
                  <p className="text-base font-poppins">
                    Lorem Ipsum fdbvxfgb cfgjhngcn
                  </p>
                </div>
              </div>

              {/* Email Section */}
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100">
                  <Mail className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium font-poppins text-black">
                    Email Address
                  </h3>
                  <p className="text-base font-poppins">
                    Lorem Ipsum fdbvxfgb cfgjhngcn
                  </p>
                </div>
              </div>

              {/* Map Section */}
              <div className="w-full max-h-[287px]  h-full rounded-lg overflow-hidden">
                <MapComponent />
              </div>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
};

export default Contact;
