import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 50%, #fed7aa 100%)",
        }}
      >
        <svg viewBox="0 0 120 120" width="75%" height="75%" fill="none">
          <path
            d="M20 85 C20 45, 45 25, 60 25 C75 25, 100 45, 100 85 Z"
            fill="#f97316"
          />
          <path
            d="M10 88 C10 85, 12 83, 15 83 L105 83 C108 83, 110 85, 110 88 C110 91.3, 107.5 94, 104 94 L16 94 C12.5 94, 10 91.3, 10 88 Z"
            fill="#292524"
          />
          <circle cx="60" cy="18" r="8" fill="#292524" />
          <path
            d="M26 80 C26 50, 42 33, 60 28 C41 33, 31 52, 31 80 Z"
            fill="white"
            fillOpacity="0.35"
          />
          <path
            d="M26 80 A 34 34 0 0 1 60 40 A 34 34 0 0 1 94 80"
            stroke="white"
            strokeOpacity="0.15"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>
    ),
    { ...size }
  );
}
