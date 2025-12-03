// scrapers/pricehistory.js
import axios from "axios";
import * as cheerio from "cheerio";

// Indian deals RSS feeds from CouponzGuru
// You can add/remove feeds as you like
const RSS_FEEDS = [
  "https://www.couponzguru.com/content/category/food/feed",      // Food / grocery / food delivery deals
  "http://www.couponzguru.com/travelcoupons/feed",               // Travel-related offers
];

// Fallback so your bot never breaks
const FALLBACK_DEALS = [
  {
    id: "demo_1",
    title: "Demo Flipkart Deal",
    description: "Fallback deal while real RSS is unavailable",
    link: "https://www.flipkart.com/",
    store: "flipkart",
    image: "",
    price: 0,
    old_price: 0,
    discount_percent: 0,
    source: "fallback",
    timestamp: Date.now(),
  },
  {
    id: "demo_2",
    title: "Demo Amazon Deal",
    description: "Fallback deal while real RSS is unavailable",
    link: "https://www.amazon.in/",
    store: "amazon",
    image: "",
    price: 0,
    old_price: 0,
    discount_percent: 0,
    source: "fallback",
    timestamp: Date.now(),
  },
];

export async function scrapePriceHistory() {
  const deals = [];

  for (const feedUrl of RSS_FEEDS) {
    try {
      console.log("Fetching RSS feed:", feedUrl);

      const res = await axios.get(feedUrl, { timeout: 15000 });

      // Parse XML as RSS using cheerio in xmlMode
      const $ = cheerio.load(res.data, { xmlMode: true });

      $("item").each((i, el) => {
        const $el = $(el);

        const title = $el.find("title").first().text().trim();
        const link = $el.find("link").first().text().trim();

        // description often contains HTML → strip tags
        const rawDescription = $el.find("description").first().text().trim();
        const desc$ = cheerio.load(rawDescription);
        const descriptionText = desc$.text().replace(/\s+/g, " ").trim();

        // Try to extract a ₹/Rs price from text
        let price = 0;
        const priceMatch =
          descriptionText.match(/(?:₹|Rs\.?)\s*([\d,]+)/i) ||
          title.match(/(?:₹|Rs\.?)\s*([\d,]+)/i);
        if (priceMatch) {
          price = Number(priceMatch[1].replace(/,/g, ""));
        }

        // Store name (very rough – you can improve later)
        // Example patterns like "on Amazon", "at Myntra" in text
        let store = "couponzguru";
        const storeMatch = descriptionText.match(
          /\b(on|at)\s+([A-Z][A-Za-z0-9& ]{2,30})/
        );
        if (storeMatch) {
          store = storeMatch[2].trim();
        }

        deals.push({
          id: `cg_${deals.length + 1}`,
          title: title || "Untitled Deal",
          description: descriptionText || title,
          link,
          store,
          image: "", // RSS usually doesn't have direct product images
          price,
          old_price: 0,
          discount_percent: 0,
          source: "couponzguru_rss",
          timestamp: Date.now(),
        });
      });
    } catch (err) {
      console.error(
        "RSS fetch error:",
        feedUrl,
        err.response?.status || err.code || "NO_STATUS",
        err.message
      );
    }
  }

  console.log("Total deals from RSS:", deals.length);

  if (!deals.length) {
    console.warn("No deals from RSS feeds, returning fallback deals");
    return FALLBACK_DEALS;
  }

  return deals;
}
