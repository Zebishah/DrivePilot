import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/common/Button';

const Home: React.FC = () => {
  return (
    <div className="relative isolate px-6 pt-14 lg:px-8">
      <div className="mx-auto max-w-2xl py-32 sm:py-48 lg:py-56">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Welcome to Our Platform
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            A professional React TypeScript application with all the essential features
            you need to build amazing products.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link to="/register">
              <Button size="lg">Get Started</Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" size="lg">
                Log in
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;