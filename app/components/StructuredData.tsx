import Script from "next/script";

export function StructuredData() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "EatPlan",
    "description": "Simple ingredient-based meal planning app and digital cookbook.",
    "applicationCategory": "LifestyleApplication, ProductivityApplication",
    "operatingSystem": "Web, Android, iOS",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "featureList": [
      "Meal Planning",
      "Auto-generated Shopping Lists",
      "Pantry Management",
      "Recipe Organization",
      "Ingredient Matching"
    ]
  };

  return (
    <Script
      id="structured-data"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
