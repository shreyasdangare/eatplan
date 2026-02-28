import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "काय खायचं? – Meal Planner",
    short_name: "काय खायचं?",
    description: "Simple ingredient-based meal planning app",
    start_url: "/",
    display: "standalone",
    background_color: "#fff7ed",
    theme_color: "#ea580c",
    icons: [
      {
        src: "/icon",
        sizes: "192x192",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      }
    ]
  };
}
