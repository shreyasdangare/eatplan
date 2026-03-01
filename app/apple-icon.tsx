import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export default function AppleIcon() {
  const base = getBaseUrl();
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
        <img
          src={`${base}/logo.png`}
          width={180}
          height={180}
          style={{ objectFit: "contain", borderRadius: "24%" }}
          alt=""
        />
      </div>
    ),
    { ...size }
  );
}
