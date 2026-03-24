import Image from "next/image";
import { ComponentProps } from "react";

type LogoProps = Omit<ComponentProps<typeof Image>, "src" | "alt">;

export function Logo({ className = "h-10 w-10", ...props }: LogoProps) {
  return (
    <Image 
      src="/logo.png" 
      alt="EatPlan Logo" 
      width={120} 
      height={120} 
      className={`object-contain ${className}`}
      unoptimized
      {...props} 
    />
  );
}
