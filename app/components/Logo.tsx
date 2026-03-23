import { SVGProps } from "react";

export function Logo({ className = "h-10 w-10", ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg 
      viewBox="0 0 120 120" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Cloche Dome */}
      <path
        d="M20 85 C20 45, 45 25, 60 25 C75 25, 100 45, 100 85 Z"
        className="fill-orange-500 dark:fill-orange-400"
      />
      {/* Plate base */}
      <path
        d="M10 88 C10 85, 12 83, 15 83 L105 83 C108 83, 110 85, 110 88 C110 91.3, 107.5 94, 104 94 L16 94 C12.5 94, 10 91.3, 10 88 Z"
        className="fill-stone-800 dark:fill-amber-100"
      />
      {/* Handle */}
      <circle cx="60" cy="18" r="8" className="fill-stone-800 dark:fill-amber-100" />
      {/* Highlight/Reflection to make it pop and look premium */}
      <path
        d="M26 80 C26 50, 42 33, 60 28 C41 33, 31 52, 31 80 Z"
        fill="white"
        fillOpacity="0.35"
      />
      {/* Decorative inner curve */}
      <path
        d="M26 80 A 34 34 0 0 1 60 40 A 34 34 0 0 1 94 80"
        stroke="white"
        strokeOpacity="0.15"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
