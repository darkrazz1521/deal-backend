import axios from "axios";
import * as cheerio from "cheerio";

const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY;
const TARGET_URL = "https://pricehistoryapp.com/deals";

// Fallback demo data (used if scraping fails)
const FALLBACK_DEALS = [
  {
    id: "demo_1",
    title: "Demo Amazon Deal",
    description: "Demo deal while real scraping is unavailable",
    link: "https://www.amazon.in/",
    store: "amazon",
    image: "",
    price: 999,
    old_price: 1999,
    discount_percent: 50,
    source: "fallback",
    timestamp: Date.now(),
  },
  {
    id: "demo_2",
    title: "Demo Flipkart Deal",
    description: "Demo deal while real scraping is unavailable",
    link: "https://www.flipkart.com/",
    store: "flipkart",
    image: "",
    price: 499,
    old_price: 999,
    discount_percent: 50,
    source: "fallback",
    timestamp: Date.now(),
  },
];

export async function scrapePriceHistory() {
  // If no API key, don't crash – just return fallback
  if (!SCRAPER_API_KEY) {
    console.warn("SCRAPER_API_KEY not set, using fallback deals");
    return FALLBACK_DEALS;
  }

  try {
    console.log("Fetching via ScraperAPI:", TARGET_URL);

    // Example for ScraperAPI-style service
    const res = await axios.get("https://api.scraperapi.com", {
      params: {
        api_key: SCRAPER_API_KEY,
        url: TARGET_URL,
        render: "true", // ask the service to execute JS
      },
      timeout: 30000,
      maxRedirects: 5,
    });

    const html = res.data;
    const $ = cheerio.load(html);
    const deals = [];

    // You may need to adjust these selectors based on actual HTML
    $(".product-item, .deal-card, .card").each((i, el) => {
      const $el = $(el);

      const title =
        $el.find(".product-title a").text().trim() ||
        $el.find("a").first().text().trim();

      if (!title) return; // skip empty cards

      let link =
        $el.find(".product-title a").attr("href") ||
        $el.find("a").first().attr("href") ||
        "";

      if (link.startsWith("/")) {
        link = "https://pricehistoryapp.com" + link;
      }

      const image =
        $el.find("img").attr("src") ||
        $el.find("img").attr("data-src") ||
        "";

      // Try to grab a price pattern like ₹1,234
      const priceMatch = $el
        .text()
        .match(/₹\s*[\d,]+/);
      const price = priceMatch
        ? Number(priceMatch[0].replace(/₹|\s|,/g, ""))
        : 0;

      const oldPriceMatch = $el
        .text()
        .match(/₹\s*[\d,]+/g);
      const old_price =
        oldPriceMatch && oldPriceMatch.length > 1
          ? Number(oldPriceMatch[1].replace(/₹|\s|,/g, ""))
          : 0;

      const discount_percent =
        old_price > price && price > 0
          ? Math.round(((old_price - price) / old_price) * 100)
          : 0;

      const store = link.includes("amazon")
        ? "amazon"
        : link.includes("flipkart")
        ? "flipkart"
        : "other";

      deals.push({
        id: "ph_" + (i + 1),
        title,
        description: title,
        link,
        store,
        image,
        price,
        old_price,
        discount_percent,
        source: "pricehistory",
        timestamp: Date.now(),
      });
    });

    console.log("Scraped deals via ScraperAPI:", deals.length);

    // If website structure changed and we got nothing, still return fallback
    if (deals.length === 0) {
      console.warn("No deals parsed, returning fallback data");
      return FALLBACK_DEALS;
    }

    return deals;
  } catch (err) {
    console.error(
      "Scraper error via API:",
      err.response?.status || err.code || "NO_STATUS",
      err.message
    );
    return FALLBACK_DEALS;
  }
}
