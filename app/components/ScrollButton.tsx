'use client';

import { ReactNode } from 'react';

interface ScrollButtonProps {
  targetId: string;
  children: ReactNode;
  className?: string;
}

export default function ScrollButton({ targetId, children, className }: ScrollButtonProps) {
  const handleClick = () => {
    document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <button onClick={handleClick} className={className}>
      {children}
    </button>
  );
} 