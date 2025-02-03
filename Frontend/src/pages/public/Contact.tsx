import React from "react";
import Banner2 from "../../components/public/Banner2";
import Container from "../../components/common/Container";
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
        <div className="flex flex-col  lg:flex-row w-full xl:w-[100%] lg:items-start  lg:justify-between gap-20  my-12 md:my-24 ">
          <div className="  lg:w-[50%] sm:px-10 md:px-20 lg:px-5 xl:px-20 h-[400px] w-full ">
            <h2 className=" font-harabara text-[28px] font-bold mb-4">
              Send us message now
            </h2>
            <form className="space-y-4 font-poppins">
              <input
                type="text"
                placeholder="Name"
                className="w-full  border-input border px-[22px] py-[11.2px]  rounded-[10px]  placeholder:text-input placeholder:text-[14px] focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <input
                type="text"
                placeholder="Phone Number"
                className="w-full  border-input border px-[22px] py-[11.2px]  rounded-[10px]  placeholder:text-input placeholder:text-[14px]  focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <textarea
                placeholder="Message"
                rows="6"
                className="w-full  border-input border px-[22px] py-[11.2px]  rounded-[10px]  placeholder:text-input placeholder:text-[14px] focus:outline-none focus:ring-2 focus:ring-primary"
              ></textarea>
              <select className="w-full  border-input border px-[22px] py-[13px]   rounded-[10px] text-[14px] text-input  focus:outline-none focus:ring-2 focus:ring-primary ">
                <option>Select City</option>
                <option>New York</option>
                <option>Los Angeles</option>
                <option>Chicago</option>
                <option>Houston</option>
              </select>
              <button
                type="submit"
                className="w-full bg-primary py-[16px]  text-black font-medium  font-poppins text-lg p-3 rounded-[10px] !mt-12   transition"
              >
                Submit
              </button>
            </form>
          </div>
          <div className=" lg:w-[50%] sm:px-10  md:px-20 lg:px-5 xl:px-20 min-h-[400px] w-full ">
            <div className="space-y-6">
              {/* Phone Number Section */}
              <div className="flex items-center gap-3">
                <div className="">
                  <h3 className="text-lg font-medium font-poppins text-black flex">
                    <img
                      src="/Assets/web resources/phone.png"
                      alt=""
                      className="w-[24px] h-[24px] mr-[14px]"
                    />{" "}
                    Phone Number
                  </h3>
                  <p className="text-base font-poppins ml-[38px]">
                    +924565745674567654
                  </p>
                </div>
              </div>

              {/* Location Section */}

              <div className="flex items-center gap-3">
                <div className="">
                  <h3 className="text-lg font-medium font-poppins text-black flex">
                    <img
                      src="/Assets/web resources/location.png"
                      alt=""
                      className="w-[17.84px] h-[24px] mr-[20.16px]"
                    />
                    Location
                  </h3>
                  <p className="text-base font-poppins ml-[38px]">
                    Lorem Ipsum fdbvxfgb cfgjhngcn
                  </p>
                </div>
              </div>

              {/* Email Section */}

              <div className="flex items-center gap-3">
                <div className="">
                  <h3 className="text-lg font-medium font-poppins text-black flex">
                    <img
                      src="/Assets/web resources/email.png"
                      alt=""
                      className="w-[21.86] h-[17px] mr-[16.14px]"
                    />
                    Email Address
                  </h3>
                  <p className="text-base font-poppins ml-[40.14px]">
                    Lorem Ipsum fdbvxfgb cfgjhngcn
                  </p>
                </div>
              </div>
            </div>
            {/* Map Section */}
            <div className="w-full max-h-[287px]  h-full rounded-[10px]  overflow-hidden shadow-custom !mt-[20px] ">
              <MapComponent />
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
};

export default Contact;
