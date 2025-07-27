import React from 'react';
import { motion } from 'framer-motion';
import { Home, Tag, Star, User, Phone } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { name: 'Home', path: '/', icon: Home, end: true }, 
  { name: 'Features', path: '/features', icon: Star, end: false },
  { name: 'Pricing', path: '/pricing', icon: Tag, end: false },
  { name: 'Contact', path: '/contact', icon: Phone, end: false },
  { name: 'Login', path: '/login', icon: User, end: false },
];

const Navbar: React.FC = () => {
  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:flex fixed top-8 left-1/2 -translate-x-1/2 z-50">
        <div className="flex items-center gap-2 p-1 bg-white/70 backdrop-blur-md rounded-full shadow-lg border border-white/20">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.end} 
              className="relative px-4 py-2 text-sm text-gray-700 hover:text-black transition-colors"
            >
              {({ isActive }) => ( 
                <>
                  {isActive && (
                    <motion.span
                      layoutId="desktop-bubble"
                      className="absolute inset-0 bg-gray-200/80 rounded-full"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <span className="relative z-10">{item.name}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed bottom-4 w-[calc(100%-2rem)] left-4 right-4 z-50">
        <div className="flex justify-around p-2 bg-white/80 backdrop-blur-md shadow-[0_-2px_10px_rgba(0,0,0,0.1)] rounded-full">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.path}
                end={item.end} 
                className="relative flex flex-col items-center justify-center w-full h-10 text-gray-600"
              >
                {({ isActive }) => ( 
                  <>
                    {isActive && (
                      <motion.div
                        layoutId="mobile-bubble"
                        className="absolute inset-0 bg-blue-100 rounded-full"
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                      />
                    )}
                    <Icon className={`relative z-10 h-6 w-6 transition-colors ${isActive ? 'text-blue-600' : ''}`} />
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default Navbar;