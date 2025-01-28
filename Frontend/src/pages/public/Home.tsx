import React from 'react';

import Banner from '../../components/Banner';
import Process from '../../components/Process';
import DrivingLessons from '../../components/DrivingLessons';
import Instructor from '../../components/Instructor';
import Testimonials from '../../components/testimonials';



const Home: React.FC = () => {
  return (
    <div>
     <Banner/>
     <Process/>
     <DrivingLessons/>
     <Instructor/>
    <Testimonials/>
    </div>

  );
};

export default Home;