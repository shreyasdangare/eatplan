/**
 * Shared recipe image fetching utilities.
 * Tries Spoonacular first, then Wikipedia with smart search fallbacks.
 */

async function fetchWikiImageByTitle(title: string): Promise<string | null> {
  const imageRes = await fetch(
    `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&format=json&pithumbsize=600`,
    { signal: AbortSignal.timeout(5000) }
  );
  if (!imageRes.ok) return null;
  const imageData = await imageRes.json();
  const pages = imageData?.query?.pages;
  if (!pages) return null;
  const pageId = Object.keys(pages)[0];
  const imageUrl = pages[pageId]?.thumbnail?.source;
  if (imageUrl && !imageUrl.toLowerCase().includes('.svg')) {
    return imageUrl;
  }
  return null;
}

export async function fetchImageUrlFromWikipedia(recipeName: string): Promise<string | null> {
  try {
    // Try up to 5 search results (sometimes the first result is a disambiguation page with no image)
    const searchRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(recipeName)}&utf8=&format=json&srlimit=5`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    const results = searchData?.query?.search;
    if (!results || results.length === 0) return null;

    // Try each search result until we find one with an image
    for (const result of results) {
      const imageUrl = await fetchWikiImageByTitle(result.title);
      if (imageUrl) return imageUrl;
    }

    // If the recipe name has multiple words, try searching for just the first main word
    // (e.g. "Rajma Chawal" → "Rajma", "Fish Curry" → search for the dish name + "food" or "Indian")
    const words = recipeName.trim().split(/\s+/);
    if (words.length > 1) {
      // Try just the first word (e.g. "Rajma" from "Rajma Chawal")
      const firstWord = words[0];
      const fallbackImage = await fetchWikiImageByTitle(firstWord);
      if (fallbackImage) return fallbackImage;

      // Try the dish + "food" context (helps disambiguate things like "Poha")
      const foodSearchRes = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(recipeName + " food dish")}&utf8=&format=json&srlimit=5`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (foodSearchRes.ok) {
        const foodData = await foodSearchRes.json();
        const foodResults = foodData?.query?.search;
        if (foodResults) {
          for (const result of foodResults) {
            const imageUrl = await fetchWikiImageByTitle(result.title);
            if (imageUrl) return imageUrl;
          }
        }
      }
    }

    return null;
  } catch (e) {
    console.error("Wikipedia fetch error", e);
    return null;
  }
}

export async function fetchImageUrlForRecipe(recipeName: string): Promise<string | null> {
  const query = recipeName.trim();
  const key = process.env.SPOONACULAR_API_KEY?.trim();
  
  if (key) {
    try {
      const res = await fetch(
        `https://api.spoonacular.com/recipes/complexSearch?query=${encodeURIComponent(query)}&number=1&apiKey=${key}`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (res.ok) {
        const data = (await res.json()) as { results?: { image?: string }[] };
        if (data.results && data.results.length > 0) {
          const smallUrl = data.results[0].image;
          if (smallUrl) return smallUrl.replace("-312x231.jpg", "-636x393.jpg");
        }
      }
    } catch (e) {
      console.error("Spoonacular fetch error", e);
    }
  }

  return await fetchImageUrlFromWikipedia(query);
}
