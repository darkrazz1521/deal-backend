// scrapers/pricehistory.js
import axios from "axios";

const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY;

const SEARCH_ENDPOINT =
  "https://api.scraperapi.com/structured/amazon/search";
const PRODUCT_ENDPOINT =
  "https://api.scraperapi.com/structured/amazon/product";

const FALLBACK_DEALS = [
  {
    id: "demo_1",
    title: "Demo Amazon Deal",
    description: "Fallback deal while ScraperAPI/Amazon is unavailable",
    link: "https://www.amazon.in/",
    store: "amazon",
    image: "",
    price: 0,
    old_price: 0,
    discount_percent: 0,
    stars: null,
    total_reviews: 0,
    source: "fallback",
    timestamp: Date.now(),
  },
];

// MAIN: list of deals (used by /api/deals)
export async function scrapePriceHistory(options = {}) {
  const {
    query = "deals",
    page = 1,
  } = options;

  if (!SCRAPER_API_KEY) {
    console.warn("SCRAPER_API_KEY missing, using fallback deals");
    return FALLBACK_DEALS;
  }

  try {
    console.log("Fetching Amazon search via ScraperAPI…", { query, page });

    const res = await axios.get(SEARCH_ENDPOINT, {
      params: {
        api_key: SCRAPER_API_KEY,
        query,
        amazon_domain: "amazon.in", // Indian market
        page,
      },
      timeout: 30000,
    });

    const results = res.data?.results || res.data?.search_results || [];
    console.log("Amazon search results:", results.length);

    if (!results.length) {
      console.warn("No Amazon search results, using fallback deals");
      return FALLBACK_DEALS;
    }

    const deals = results
      .filter((r) => r.type === "search_product")
      .map((r, index) => {
        const asin = r.asin || `amz_${index + 1}`;
        const title = r.name || "Amazon Product";

        const description =
          r.purchase_history_message ||
          `Rating: ${r.stars || "N/A"} • Reviews: ${r.total_reviews || 0}`;

        const link = r.url;
        const image = r.image || "";

        const price = typeof r.price === "number" ? r.price : 0;
        const oldPrice =
          typeof r.original_price?.price === "number"
            ? r.original_price.price
            : price;

        let discountPercent = 0;
        if (oldPrice > price && price > 0) {
          discountPercent = Math.round(((oldPrice - price) / oldPrice) * 100);
        }

        return {
          id: asin,
          title,
          description,
          link,
          store: "amazon",
          image,
          price,
          old_price: oldPrice,
          discount_percent: discountPercent,
          stars: r.stars ?? null,
          total_reviews: r.total_reviews ?? 0,
          source: "amazon_scraperapi_search",
          timestamp: Date.now(),
        };
      })
      .filter((d) => d.link);

    console.log("Mapped deals:", deals.length);

    if (!deals.length) {
      console.warn("No mapped deals, using fallback deals");
      return FALLBACK_DEALS;
    }

    return deals;
  } catch (err) {
    console.error(
      "ScraperAPI Amazon search error:",
      err.response?.status || err.code || "NO_STATUS",
      err.message
    );
    return FALLBACK_DEALS;
  }
}

// EXTRA: single product details (optional for future frontend)
export async function fetchAmazonProduct(asin, country = "in", tld = "in") {
  if (!SCRAPER_API_KEY) {
    throw new Error("SCRAPER_API_KEY missing");
  }
  if (!asin) {
    throw new Error("ASIN is required");
  }

  try {
    console.log("Fetching Amazon product via ScraperAPI…", { asin, country, tld });

    const res = await axios.get(PRODUCT_ENDPOINT, {
      params: {
        api_key: SCRAPER_API_KEY,
        asin,
        country,
        tld,
      },
      timeout: 30000,
    });

    const data = res.data || {};

    const name = data.name || "Amazon Product";
    const productInfo = data.product_information || {};
    const priceString = data.pricing || data.list_price || "";
    const firstImage = Array.isArray(data.images) ? data.images[0] : "";

    let price = 0;
    const priceMatch = priceString.match(/(?:₹|\$|£|€)\s*([\d,]+)/);
    if (priceMatch) {
      price = Number(priceMatch[1].replace(/,/g, ""));
    }

    return {
      asin: productInfo.asin || asin,
      title: name,
      description: data.small_description || data.full_description || "",
      images: data.images || [],
      image: firstImage,
      average_rating:
        data.average_rating || productInfo.customer_reviews?.stars || null,
      total_reviews:
        data.total_reviews || productInfo.customer_reviews?.ratings_count || 0,
      price,
      raw_price_string: priceString,
      product_category: data.product_category || "",
      brand: data.brand || "",
      brand_url: data.brand_url || "",
      feature_bullets: data.feature_bullets || [],
      source: "amazon_scraperapi_product",
    };
  } catch (err) {
    console.error(
      "ScraperAPI Amazon product error:",
      err.response?.status || err.code || "NO_STATUS",
      err.message
    );
    throw err;
  }
}
