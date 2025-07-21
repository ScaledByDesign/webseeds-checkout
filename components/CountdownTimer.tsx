'use client';

import { useState, useEffect } from 'react';

interface CountdownTimerProps {
  initialSeconds: number;
  className?: string;
}

export default function CountdownTimer({ initialSeconds, className = '' }: CountdownTimerProps) {
  const [countdown, setCountdown] = useState(initialSeconds);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <span className={`${className}`}>
      {formatTime(countdown)}
    </span>
  );
}