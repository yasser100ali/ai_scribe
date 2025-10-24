"use client";

import { motion } from "framer-motion";
import { Button } from "./ui/button";
import { GitIcon } from "./icons";

export const Navbar = () => {
  const handleLogoClick = () => {
    window.location.href = "/";
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
          {/* Logo - DeepScribe on left */}
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
              DeepScribe Healthcare Assistant
            </button>
          </motion.div>

          {/* Navigation Links - Right side */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="flex items-center gap-3"
          >
            <a 
              href="/"
              className="no-underline"
            >
              <Button 
                variant="ghost" 
                size="sm"
                className="border border-border hover:border-primary/50 hover:bg-accent hover:text-primary transition-all font-medium"
              >
                Provider Portal
              </Button>
            </a>
            <a 
              href="/patient"
              className="no-underline"
            >
              <Button 
                variant="ghost" 
                size="sm"
                className="border border-border hover:border-primary/50 hover:bg-accent hover:text-primary transition-all font-medium"
              >
                Patient Portal
              </Button>
            </a>
            <a 
              href="/about"
              className="no-underline"
            >
              <Button 
                variant="ghost" 
                size="sm"
                className="border border-border hover:border-primary/50 hover:bg-accent hover:text-primary transition-all font-medium"
              >
                About & Project Updates!
              </Button>
            </a>
            <a 
              href="https://github.com/yasser100ali/ai_scribe" 
              target="_blank" 
              rel="noopener noreferrer"
              className="no-underline"
            >
              <Button 
                variant="ghost" 
                size="icon"
                className="border border-border hover:border-primary/50 hover:bg-accent hover:text-primary transition-all"
              >
                <GitIcon />
              </Button>
            </a>
          </motion.div>
        </div>
      </div>
    </motion.nav>
  );
};
