// // import React from 'react';
// // import { Link } from 'react-router-dom';
// // import { useSelector, useDispatch } from 'react-redux';
// // import { Menu, X, User, LogOut } from 'lucide-react';
// // import { logout } from '../../store/slices/authSlice';
// // import type { RootState } from '../../store';
// // import Button from './Button';

// // const Navbar: React.FC = () => {
// //   const [isMenuOpen, setIsMenuOpen] = React.useState(false);
// //   const dispatch = useDispatch();
// //   const { user } = useSelector((state: RootState) => state.auth);

// //   const handleLogout = () => {
// //     dispatch(logout());
// //   };
// //   return (
// //     <nav className="bg-white shadow-lg">
// //       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
// //         <div className="flex justify-between h-16">
// //           <div className="flex">
// //             <Link to="/" className="flex-shrink-0 flex items-center">
// //               <span className="text-xl font-bold text-gray-800">Logo</span>
// //             </Link>
// //           </div>

// //           <div className="hidden sm:ml-6 sm:flex sm:items-center">
// //             {user ? (
// //               <>
// //                 <Link to="/dashboard" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900">
// //                   Dashboard
// //                 </Link>
// //                 <div className="ml-3 relative">
// //                   <Button
// //                     variant="outline"
// //                     size="sm"
// //                     onClick={handleLogout}
// //                     className="flex items-center"
// //                   >
// //                     <LogOut className="w-4 h-4 mr-2" />
// //                     Logout
// //                   </Button>
// //                 </div>
// //               </>
// //             ) : (
// //               <div className="flex items-center space-x-4">
// //                 <Link to="/login">
// //                   <Button variant="outline" size="sm">Login</Button>
// //                 </Link>
// //                 <Link to="/register">
// //                   <Button size="sm">Register</Button>
// //                 </Link>
// //               </div>
// //             )}
// //           </div>

// //           <div className="flex items-center sm:hidden">
// //             <button
// //               onClick={() => setIsMenuOpen(!isMenuOpen)}
// //               className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
// //             >
// //               {isMenuOpen ? (
// //                 <X className="block h-6 w-6" />
// //               ) : (
// //                 <Menu className="block h-6 w-6" />
// //               )}
// //             </button>
// //           </div>
// //         </div>
// //       </div>

// //       {/* Mobile menu */}
// //       {isMenuOpen && (
// //         <div className="sm:hidden">
// //           <div className="pt-2 pb-3 space-y-1">
// //             {user ? (
// //               <>
// //                 <Link
// //                   to="/dashboard"
// //                   className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
// //                 >
// //                   Dashboard
// //                 </Link>
// //                 <button
// //                   onClick={handleLogout}
// //                   className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
// //                 >
// //                   Logout
// //                 </button>
// //               </>
// //             ) : (
// //               <>
// //                 <Link
// //                   to="/login"
// //                   className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
// //                 >
// //                   Login
// //                 </Link>
// //                 <Link
// //                   to="/register"
// //                   className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
// //                 >
// //                   Register
// //                 </Link>
// //               </>
// //             )}
// //           </div>
// //         </div>
// //       )}
// //     </nav>
// //   );
// // };

// // export default Navbar;






import React from 'react';
import { NavLink } from 'react-router-dom'; // Import NavLink from react-router-dom
import { Button } from '@mui/material';

const Navbar: React.FC = () => {
  return (
    <nav className="bg-gray-900 text-white py-4 px-6 flex justify-between items-center">
      {/* Logo Section */}
      <div className="flex items-center">
        <img
          src="/dsp.png"
          alt="Logo"
          className="h-10 w-auto ml-8"
        />
      </div>

      {/* Links Section */}
      <ul className="flex space-x-6">
        <li>
          <NavLink
            to="/home"
            className={({ isActive }) =>
              isActive ? 'text-blue-400' : 'hover:text-gray-300'
            }
          >
            Home
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/about"
            className={({ isActive }) =>
              isActive ? 'text-blue-400' : 'hover:text-gray-300'
            }
          >
            About Us
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/contact"
            className={({ isActive }) =>
              isActive ? 'text-blue-400' : 'hover:text-gray-300'
            }
          >
            Contact Us
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/instructors"
            className={({ isActive }) =>
              isActive ? 'text-blue-400' : 'hover:text-gray-300'
            }
          >
            Our Instructors
          </NavLink>
        </li>
      </ul>

      {/* Button Section */}
      <div className="mr-8">
        <Button
          variant="contained"
          sx={{
            paddingLeft: '2rem',
            paddingRight: '2rem',
            borderRadius:"10px",
            backgroundColor: '#58B4AE',
            '&:hover': { backgroundColor: '#479A93' },
            textTransform: 'none',
            color: '#000',
          
          }}
        >
          Sign In
        </Button>
      </div>
    </nav>
  );
};

export default Navbar;

