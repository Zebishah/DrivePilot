
import { Button } from "@mui/material";

const DrivingLessons = () => {
  return (
    <div className="flex flex-col items-center p-4 bg-white">
      {/* Header Section */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-harabara font-bold mb-2">What driving lessons are you after?</h1>
        <p className=" text-lg font-poppins">
          Lorem ipsum dolor sit amet consectetur. Ultricies sed id nulla ornare.</p><p className=" font-poppins text-lg"> Arcu nunc tincidunt cursus
          convallis diam tortor.
        </p>
      </div>

      {/* Cards Section */}
      <div className="grid grid-cols-1 font-poppins md:grid-cols-2  max-w-5xl">
        {/* Driving Lessons Card */}
        <div
          className="relative bg-cover rounded-tl-lg  bg-center p-6 text-white flex flex-col justify-between items-center text-center"
          style={{
            backgroundImage: "url('/images/driving.png')",
            minHeight: "300px",
            position: "relative",
          }}
        >
          <div className="absolute rounded-tl-lg  inset-0 bg-black bg-opacity-50"></div>
          <div className="relative m-12 z-10">
            <h2 className="text-3xl font-normal">Driving Lessons</h2>
            <p className="text-xl">£37 per hour</p>
            <p className="mt-2 text-lg">
              If you’re having trouble passing your test, or haven’t driven in a long time, a test review lesson with
              one of our senior instructors will boost your confidence dramatically.
            </p>
            <Button
            variant="contained"
            className="relative z-10"
            style={{
              backgroundColor: "#5FC2D3",
              borderRadius: "10px",
              marginTop:"1rem",
              textTransform: "none",
              fontFamily: 'Poppins, sans-serif' ,
            }}
          >
            Book Now
          </Button>
          </div>
        </div>

        {/* Refresher Card */}
        <div
          className="p-6 rounded-tr-lg  text-gray-900 flex flex-col justify-between items-center text-center"
          style={{
            backgroundColor: "#5FC2D3",
          }}
        >
          <div className="m-12">
            <h2 className="text-3xl font-normal">Refresher</h2>
            <p className="text-xl">£37 per hour</p>
            <p className="mt-2 text-lg">
              If you’re having trouble passing your test, or haven’t driven in a long time, a test review lesson with
              one of our senior instructors will boost your confidence dramatically.
            </p>
            <Button
            variant="contained"
            className="text-white"
            style={{
              backgroundColor: "#15172C",
              borderRadius: "10px",
              marginTop:"1rem",
              textTransform: "none",
              fontFamily: 'Poppins, sans-serif' ,
            }}
          >
            Book Now
          </Button>
          </div>
        </div>

        {/* Auto Driving Lessons Card */}
        <div
          className="md:col-span-2 p-6 rounded-bl-lg rounded-br-lg text-white flex flex-col justify-between items-center text-center"
          style={{
            backgroundColor: "#15172C",
          }}
        >
          <div className="m-12">
            <h2 className="text-3xl font-normal">Auto Driving Lessons</h2>
            <p className="text-xl">£37 per hour</p>
            <p className="mt-2 text-lg">
              If you’re having trouble passing your test, or haven’t driven in a long time, a test</p>
              <p> review lesson with one of our senior instructors will boost your confidence </p>
            <p> dramatically.
            </p>
         
          <Button
            variant="contained"
            style={{
              backgroundColor: "#5FC2D3",
              borderRadius: "10px",
              marginTop:"2rem",
              textTransform: "none",
              color:"black",
              fontFamily: 'Poppins, sans-serif' ,


            }}
          >
            Book Now
          </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DrivingLessons;

