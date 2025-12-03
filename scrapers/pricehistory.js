import axios from "axios";

const DUMMY_JSON_URL = "https://dummyjson.com/products?limit=50";

const FALLBACK_DEALS = [
  {
    id: "demo_1",
    title: "Demo Amazon Deal",
    description: "Demo deal while real API is unavailable",
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
    description: "Demo deal while real API is unavailable",
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
  try {
    console.log("Fetching deals from DummyJSON:", DUMMY_JSON_URL);

    const res = await axios.get(DUMMY_JSON_URL, {
      timeout: 15000,
    });

    const products = res.data?.products || [];
    const deals = products.map((p) => {
      const discountPercent =
        typeof p.discountPercentage === "number"
          ? Math.round(p.discountPercentage)
          : 0;

      const oldPrice =
        discountPercent > 0
          ? Math.round(p.price / (1 - discountPercent / 100))
          : p.price;

      return {
        id: "dummy_" + p.id,
        title: p.title,
        description: p.description,
        link: `https://dummyjson.com/products/${p.id}`,
        store: p.brand || "dummyjson",
        image: p.thumbnail || (p.images && p.images[0]) || "",
        price: p.price,
        old_price: oldPrice,
        discount_percent: discountPercent,
        source: "dummyjson",
        timestamp: Date.now(),
      };
    });

    console.log("DummyJSON deals:", deals.length);

    if (deals.length === 0) {
      console.warn("No deals from DummyJSON, returning fallback");
      return FALLBACK_DEALS;
    }

    return deals;
  } catch (err) {
    console.error(
      "Deals API error:",
      err.response?.status || err.code || "NO_STATUS",
      err.message
    );
    return FALLBACK_DEALS;
  }
}
