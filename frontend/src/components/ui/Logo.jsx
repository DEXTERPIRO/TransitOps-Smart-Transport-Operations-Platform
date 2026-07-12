import React from 'react';

export default function Logo({ size = 16, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`text-[var(--text-primary)] ${className}`}
    >
      {/* 
        Modern Monogram Logo: Intersecting 'T' (Transit) and 'O' (Operations).
        A sleek futuristic circle (O) containing a clean route curve (T) and GPS node.
      */}
      <g stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        {/* Outer Operations Loop 'O' */}
        <circle cx="12" cy="12" r="8.5" />
        
        {/* Horizontal Transit Bar */}
        <path d="M8 8.5 H16" />
        
        {/* Vertical Routing Line forming the 'T' */}
        <path d="M12 8.5 V14" />
        
        {/* GPS Waypoint Node */}
        <circle cx="12" cy="15.5" r="1" fill="currentColor" stroke="none" />
      </g>
    </svg>
  );
}
