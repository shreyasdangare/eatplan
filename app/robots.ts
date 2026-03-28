import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://eatplan.app";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/settings/", "/login/", "/signup/", "/auth/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
