import { ComponentProps } from "react";

type LogoProps = ComponentProps<"svg">;

export function Logo({ className = "h-10 w-10", ...props }: LogoProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Dark rounded-square background */}
      <rect width="120" height="120" rx="26" fill="#2D2D2D" />
      {/* Cloche icon */}
      <g stroke="#F97316" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* Handle */}
        <circle cx="60" cy="38" r="5" />
        {/* Dome */}
        <path d="M30 78a30 30 0 0 1 60 0" />
        {/* Plate line */}
        <line x1="24" y1="78" x2="96" y2="78" />
      </g>
    </svg>
  );
}

