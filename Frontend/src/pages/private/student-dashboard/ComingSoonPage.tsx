import { useState, useEffect } from "react";
import { Mail, ArrowRight, Github, Twitter, Instagram } from "lucide-react";

export default function ComingSoonPage() {
  const [countdown, setCountdown] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  // Set launch date - 30 days from now
  const launchDate = new Date();
  launchDate.setDate(launchDate.getDate() + 30);

  // Update countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const difference = launchDate.getTime() - now.getTime();

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setCountdown({ days, hours, minutes, seconds });

      if (difference <= 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // No email submission needed

  return (
    <div className="h-[70vh] flex flex-col bg-gradient-to-br from-[#13152A] to-[#4BA1B0] text-white">
      {/* Floating shapes for visual interest */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-white rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse"></div>
      <div className="absolute top-40 right-10 w-40 h-40 bg-[#4BA1B0] rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
      <div className="absolute bottom-20 left-1/4 w-36 h-36 bg-white rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse"></div>

      <header className="p-6">
        <h1 className="text-4xl font-bold tracking-tight">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-[#4BA1B0]">
            Driving School Platform
          </span>
        </h1>
      </header>

      <main className="flex-grow flex flex-col md:flex-row items-center justify-center px-6 relative z-10">
        <div className="w-full max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-12">
          {/* Left column - Main content */}
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-4xl md:text-6xl font-extrabold mb-6">
              Something amazing is
              <span className="block mt-2 bg-clip-text text-transparent bg-gradient-to-r from-white to-[#4BA1B0]">
                coming soon
              </span>
            </h2>

            <p className="text-lg md:text-xl text-gray-200 mb-8 max-w-2xl">
              We're building something exciting and can't wait to share it with
              you. Be the first to know when we launch!
            </p>

            {/* Countdown timer */}
            <div className="grid grid-cols-4 gap-4 mb-10 max-w-lg mx-auto md:mx-0">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 flex flex-col">
                <span className="text-3xl font-bold">{countdown.days}</span>
                <span className="text-xs uppercase tracking-wide">Days</span>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 flex flex-col">
                <span className="text-3xl font-bold">{countdown.hours}</span>
                <span className="text-xs uppercase tracking-wide">Hours</span>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 flex flex-col">
                <span className="text-3xl font-bold">{countdown.minutes}</span>
                <span className="text-xs uppercase tracking-wide">Minutes</span>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 flex flex-col">
                <span className="text-3xl font-bold">{countdown.seconds}</span>
                <span className="text-xs uppercase tracking-wide">Seconds</span>
              </div>
            </div>
          </div>

          {/* Right column - Image/Illustration */}
          <div className="flex-1 flex justify-center">
            <div className="w-full max-w-md aspect-square rounded-3xl bg-gradient-to-br from-white/20 to-[#4BA1B0]/30 backdrop-blur-sm p-1">
              <div className="w-full h-full rounded-2xl overflow-hidden flex items-center justify-center bg-[#13152A]/50">
                <div className="text-center p-8">
                  <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-r from-white to-[#4BA1B0] flex items-center justify-center">
                    <svg
                      className="w-12 h-12 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      ></path>
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Join the Waitlist</h3>
                  <p className="text-gray-300">
                    Be among the first to experience our platform when we
                    launch.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="p-8 text-center">
        <div className="flex justify-center gap-6 mb-6">
          <a
            href="#"
            className="text-gray-300 hover:text-white transition-colors"
          >
            <Github size={20} />
          </a>
          <a
            href="#"
            className="text-gray-300 hover:text-white transition-colors"
          >
            <Twitter size={20} />
          </a>
          <a
            href="#"
            className="text-gray-300 hover:text-white transition-colors"
          >
            <Instagram size={20} />
          </a>
        </div>
        <p className="text-sm text-gray-300">
          © {new Date().getFullYear()} Project Name. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
