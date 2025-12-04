"use client";

import { motion } from "framer-motion";
import { Button } from "./ui/button";
import { GitIcon } from "./icons";
import { useProviderLayout } from "./provider-layout";
import { useState } from "react";

export const Navbar = () => {
  const { onViewPatients } = useProviderLayout();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const handleLogoClick = () => {
    window.location.href = "/";
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const closeDropdown = () => {
    setIsDropdownOpen(false);
  };

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl"
    >
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo - on left */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center"
          >
            <button
              onClick={handleLogoClick}
              className="relative px-3 py-1.5 rounded-lg border border-primary/40 bg-primary/5 font-mono font-semibold text-foreground tracking-wider hover:border-primary/60 hover:bg-primary/10 transition-all cursor-pointer text-xs md:text-sm"
            >
              AI Healthcare Assistant
            </button>
          </motion.div>

          {/* Right - Dropdown Menu */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="flex items-center gap-3 relative"
          >
            <button
              onClick={toggleDropdown}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:border-primary/50 hover:bg-accent transition-all"
            >
              <span className="text-sm font-medium">Menu</span>
              <svg
                className={`w-4 h-4 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown Content */}
            {isDropdownOpen && (
              <>
                {/* Backdrop to close dropdown */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={closeDropdown}
                />
                
                {/* Dropdown menu */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-border/50 bg-background/95 backdrop-blur-xl shadow-lg z-50 overflow-hidden"
                >
                  <div className="py-2">
                    {onViewPatients && (
                      <button
                        onClick={() => {
                          onViewPatients();
                          closeDropdown();
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-accent transition-colors flex items-center gap-3 group"
                      >
                        <span className="text-2xl">📋</span>
                        <span className="text-sm font-medium group-hover:text-primary">View patient records</span>
                      </button>
                    )}
                    <a 
                      href="/"
                      className="w-full px-4 py-3 text-left hover:bg-accent transition-colors flex items-center gap-3 group no-underline"
                      onClick={closeDropdown}
                    >
                      <span className="text-2xl">👨‍⚕️</span>
                      <span className="text-sm font-medium group-hover:text-primary">Provider Portal</span>
                    </a>
                    <a 
                      href="/patient"
                      className="w-full px-4 py-3 text-left hover:bg-accent transition-colors flex items-center gap-3 group no-underline"
                      onClick={closeDropdown}
                    >
                      <span className="text-2xl">🏥</span>
                      <span className="text-sm font-medium group-hover:text-primary">Patient Portal</span>
                    </a>
                    <div className="h-px bg-border/50 my-2" />
                    <a 
                      href="https://github.com/yasser100ali/deepscribe-project" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-full px-4 py-3 text-left hover:bg-accent transition-colors flex items-center gap-3 group no-underline"
                      onClick={closeDropdown}
                    >
                      <GitIcon />
                      <span className="text-sm font-medium group-hover:text-primary">GitHub Repository</span>
                    </a>
                  </div>
                </motion.div>
              </>
            )}
          </motion.div>
        </div>
      </div>
    </motion.nav>
  );
};
