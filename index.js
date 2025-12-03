import express from "express";
import cors from "cors";
import { scrapePriceHistory } from "./scrapers/pricehistory.js";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Root route – good for UptimeRobot
app.get("/", (req, res) => {
  res.send("Deal backend is up ✅");
});

// Simple health check (no scraping)
app.get("/health", (req, res) => {
  res.json({ ok: true, service: "deal-backend", uptime: process.uptime() });
});

// Existing API health
app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

// Deals API – this one calls the scraper (can sometimes fail)
app.get("/api/deals", async (req, res) => {
  try {
    const deals = await scrapePriceHistory();
    res.json({ data: deals });
  } catch (err) {
    console.error("Deals endpoint error:", err.message);
    res.status(500).json({ error: "Failed to fetch deals" });
  }
});

app.listen(PORT, () => {
  console.log("Server running on " + PORT);
});
