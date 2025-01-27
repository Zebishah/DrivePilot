
import { Button } from "@mui/material";

const DrivingLessons = () => {
  return (
    <div className="flex flex-col items-center p-4 bg-gray-100">
      {/* Header Section */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">What driving lessons are you after?</h1>
        <p className="text-gray-600 text-lg">
          Lorem ipsum dolor sit amet consectetur. Ultricies sed id nulla ornare.</p><p className="text-gray-600 text-lg"> Arcu nunc tincidunt cursus
          convallis diam tortor.
        </p>
      </div>

      {/* Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-2  max-w-5xl">
        {/* Driving Lessons Card */}
        <div
          className="relative bg-cover bg-center p-6 text-white flex flex-col justify-between items-center text-center"
          style={{
            backgroundImage: "url('/images/driving.png')",
            minHeight: "300px",
            position: "relative",
          }}
        >
          <div className="absolute inset-0 bg-black bg-opacity-50"></div>
          <div className="relative z-10">
            <h2 className="text-xl font-bold">Driving Lessons</h2>
            <p className="text-lg">£37 per hour</p>
            <p className="mt-2">
              If you’re having trouble passing your test, or haven’t driven in a long time, a test review lesson with
              one of our senior instructors will boost your confidence dramatically.
            </p>
            <Button
            variant="contained"
            className="relative z-10"
            style={{
              backgroundColor: "#5FC2D3",
              borderRadius: "10px",
              marginTop:"1rem"
            }}
          >
            Book Now
          </Button>
          </div>
        
        </div>

        {/* Refresher Card */}
        <div
          className="p-6 text-gray-900 flex flex-col justify-between items-center text-center"
          style={{
            backgroundColor: "#5FC2D3",
          }}
        >
          <div>
            <h2 className="text-xl font-bold">Refresher</h2>
            <p className="text-lg">£37 per hour</p>
            <p className="mt-2">
              If you’re having trouble passing your test, or haven’t driven in a long time, a test review lesson with
              one of our senior instructors will boost your confidence dramatically.
            </p>
            <Button
            variant="contained"
            className="text-white"
            style={{
              backgroundColor: "#15172C",
              borderRadius: "10px",
              marginTop:"1rem"
            }}
          >
            Book Now
          </Button>
          </div>
        </div>

        {/* Auto Driving Lessons Card */}
        <div
          className="md:col-span-2 p-6 text-white flex flex-col justify-between items-center text-center"
          style={{
            backgroundColor: "#15172C",
          }}
        >
          <div>
            <h2 className="text-xl font-bold">Auto Driving Lessons</h2>
            <p className="text-lg">£37 per hour</p>
            <p className="mt-2">
              If you’re having trouble passing your test, or haven’t driven in a long time, a test</p>
              <p> review lesson with one of our senior instructors will boost your confidence </p>
            <p> dramatically.
            </p>
          </div>
          <Button
            variant="contained"
            style={{
              backgroundColor: "#5FC2D3",
              borderRadius: "10px",
              marginTop:"2rem"
            }}
          >
            Book Now
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DrivingLessons;

