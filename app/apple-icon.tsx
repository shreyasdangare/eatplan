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
          borderRadius: "24%",
        }}
      >
        <span
          style={{
            fontSize: 80,
            lineHeight: 1,
          }}
          aria-hidden
        >
          🍽
        </span>
      </div>
    ),
    { ...size }
  );
}
