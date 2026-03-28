import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EatPlan – Smart Meal Planner",
    short_name: "EatPlan",
    description: "Simple ingredient-based meal planning and digital cookbook.",
    start_url: "/",
    display: "standalone",
    background_color: "#1c1917",
    theme_color: "#ea580c",
    categories: ["food", "lifestyle", "productivity"],
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
