import React, { useEffect, useState } from "react";

const Typewriter = ({ text = "Hello, World!", speed = 40 }) => {
  const [displayText, setDisplayText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayText((prev) => prev + text[currentIndex]);
        setCurrentIndex((prev) => prev + 1);
      }, speed);

      return () => clearTimeout(timer);
    }
  }, [currentIndex, text, speed]);

  useEffect(() => {
    // Reset when text prop changes
    setDisplayText("");
    setCurrentIndex(0);
  }, [text]);

  return (
    <div className="min-h-[2rem] flex-1 p-4 font-mono text-mineshaft-300">
      {displayText}
      <span className="animate-pulse">|</span>
    </div>
  );
};

export default Typewriter;
