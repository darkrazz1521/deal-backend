import axios from "axios";
import * as cheerio from "cheerio";

const PRICE_HISTORY_URL = "https://pricehistoryapp.com/deals";

export async function scrapePriceHistory() {
  try {
    console.log("Fetching:", PRICE_HISTORY_URL);

    const res = await axios.get(PRICE_HISTORY_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept":
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Connection": "keep-alive",
        "Referer": "https://pricehistoryapp.com/",
      },
      timeout: 15000, // 15s timeout
      maxRedirects: 5,
    });

    const $ = cheerio.load(res.data);
    const deals = [];

    // NOTE: Page content is mostly loaded via JS, so this may not find items.
    // We keep the loop so it doesn't crash your backend.
    $(".product-item, .deal-card").each((i, el) => {
      const title = $(el).find("a").first().text().trim();
      let link = $(el).find("a").first().attr("href") || "";

      if (link.startsWith("/")) {
        link = "https://pricehistoryapp.com" + link;
      }

      const image = $(el).find("img").first().attr("src") || "";

      const price =
        Number(
          $(el)
            .text()
            .match(/₹[\d,]+/g)?.[0]
            ?.replace(/₹|,/g, "")
        ) || 0;

      const old_price = 0; // we don't have clear selector here

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

    console.log("PriceHistory deals scraped:", deals.length);
    return deals;
  } catch (err) {
    console.error(
      "Scraper error:",
      err.response?.status || err.code || "NO_STATUS",
      err.message
    );
    return [];
  }
}
