import axios from "axios";
import * as cheerio from "cheerio";

// Indian deals RSS feeds from CouponzGuru
const RSS_FEEDS = [
  "https://www.couponzguru.com/content/category/food/feed",
  "http://www.couponzguru.com/travelcoupons/feed",
];

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

function isDealTitle(title = "") {
  // Simple check: keep things that look like offers/coupons
  const dealWords = /(coupon|promo code|code|offer|off|deal|booking|flights?|hotel|cashback|save)/i;
  return dealWords.test(title);
}

export async function scrapePriceHistory() {
  const deals = [];

  for (const feedUrl of RSS_FEEDS) {
    try {
      console.log("Fetching RSS feed:", feedUrl);

      const res = await axios.get(feedUrl, { timeout: 15000 });

      const $ = cheerio.load(res.data, { xmlMode: true });

      $("item").each((i, el) => {
        const $el = $(el);

        const rawTitle = $el.find("title").first().text().trim();
        const link = $el.find("link").first().text().trim();
        let rawDescription = $el.find("description").first().text().trim();

        // Remove HTML tags from description
        rawDescription = rawDescription.replace(/<[^>]+>/g, " ");

        // Remove "The post ... appeared first on ..."
        const descParts = rawDescription.split("The post");
        let descriptionText = descParts[0].trim().replace(/\s+/g, " ");

        if (!descriptionText) descriptionText = rawTitle;

        // Filter: only keep items that look like deals
        if (!isDealTitle(rawTitle) && !isDealTitle(descriptionText)) {
          return; // skip blog-type posts
        }

        // Try to extract price from text (₹ or Rs)
        let price = 0;
        const priceMatch =
          descriptionText.match(/(?:₹|Rs\.?)\s*([\d,]+)/i) ||
          rawTitle.match(/(?:₹|Rs\.?)\s*([\d,]+)/i);
        if (priceMatch) {
          price = Number(priceMatch[1].replace(/,/g, ""));
        }

        // Store name (rough heuristic)
        let store = "CouponzGuru";
        const storeMatch = descriptionText.match(
          /\b(on|at)\s+([A-Z][A-Za-z0-9& ]{2,30})/
        );
        if (storeMatch) {
          store = storeMatch[2].trim();
        }

        deals.push({
          id: `cg_${deals.length + 1}`,
          title: rawTitle || "Untitled Deal",
          description: descriptionText,
          link,
          store,
          image: "",
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

  console.log("Total deals from RSS (after filter):", deals.length);

  if (!deals.length) {
    console.warn("No deals from RSS feeds, returning fallback deals");
    return FALLBACK_DEALS;
  }

  return deals;
}
