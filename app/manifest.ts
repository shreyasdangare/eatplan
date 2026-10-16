import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "EatPlan – काय खायचं?",
    short_name: "EatPlan",
    description: "Plan meals, shop and cook with your household",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fafaf9",
    theme_color: "#fafaf9",
    categories: ["food", "lifestyle"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Shopping list", short_name: "List", url: "/shopping-list", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "This week's plan", short_name: "Plan", url: "/plan", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Speak a recipe", short_name: "Speak", url: "/dishes/new?mode=voice", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Add a recipe", short_name: "Add recipe", url: "/dishes/new", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
    ],
    // Share a recipe link from any app straight into the importer (Android).
    share_target: {
      action: "/dishes/new",
      method: "GET",
      params: { title: "title", text: "text", url: "url" },
    },
  } as MetadataRoute.Manifest;
}
