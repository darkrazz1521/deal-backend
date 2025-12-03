import express from "express";
import cors from "cors";
import {
  scrapePriceHistory,
  fetchAmazonProduct,
} from "./scrapers/pricehistory.js";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Deal backend is up ✅");
});

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "deal-backend", uptime: process.uptime() });
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

// GET /api/deals?q=boxing+gloves&minDiscount=20&maxPrice=2000&sort=discount_desc&limit=10
app.get("/api/deals", async (req, res) => {
  try {
    const query = req.query.q || "deals";
    const page = Number(req.query.page || 1);
    const minDiscount = Number(req.query.minDiscount || 0);
    const maxPrice = req.query.maxPrice
      ? Number(req.query.maxPrice)
      : null;
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const sort = req.query.sort || "discount_desc";

    let deals = await scrapePriceHistory({ query, page });

    // Filter by discount
    if (minDiscount > 0) {
      deals = deals.filter((d) => d.discount_percent >= minDiscount);
    }

    // Filter by max price
    if (maxPrice !== null && !Number.isNaN(maxPrice)) {
      deals = deals.filter(
        (d) => d.price && d.price > 0 && d.price <= maxPrice
      );
    }

    // Sorting
    switch (sort) {
      case "price_asc":
        deals.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case "price_desc":
        deals.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case "rating_desc":
        deals.sort((a, b) => (b.stars || 0) - (a.stars || 0));
        break;
      case "discount_desc":
      default:
        deals.sort(
          (a, b) => (b.discount_percent || 0) - (a.discount_percent || 0)
        );
        break;
    }

    // Limit results
    const limited = deals.slice(0, limit);

    res.json({
      meta: {
        query,
        page,
        total: deals.length,
        returned: limited.length,
        minDiscount,
        maxPrice,
        sort,
      },
      data: limited,
    });
  } catch (err) {
    console.error("Deals endpoint error:", err.message);
    res.status(500).json({ error: "Failed to fetch deals" });
  }
});

// Detailed product info for future product page on website
app.get("/api/product/:asin", async (req, res) => {
  try {
    const asin = req.params.asin;
    const product = await fetchAmazonProduct(asin, "in", "in");
    res.json({ data: product });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch product details" });
  }
});

app.listen(PORT, () => {
  console.log("Server running on " + PORT);
});
