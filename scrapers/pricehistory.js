import axios from "axios";
import cheerio from "cheerio";

export async function scrapePriceHistory() {
  const url = "https://pricehistory.in/todays-deals";

  try {
    const res = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (DealBot)"
      }
    });

    const $ = cheerio.load(res.data);
    const deals = [];

    $(".product-item").each((i, el) => {
      const title = $(el).find(".product-title a").text().trim();
      let link = $(el).find(".product-title a").attr("href") || "";

      if (link.startsWith("/")) {
        link = "https://pricehistory.in" + link;
      }

      const image = $(el).find(".product-image img").attr("src") || "";

      const price = Number(
        $(el).find(".price-current").text().replace(/₹|,/g, "")
      ) || 0;

      const old_price = Number(
        $(el).find(".price-old").text().replace(/₹|,/g, "")
      ) || 0;

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
        timestamp: Date.now()
      });
    });

    return deals;
  } catch (err) {
    console.error("Scraper error:", err.message);
    return [];
  }
}
