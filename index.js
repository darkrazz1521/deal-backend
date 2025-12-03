import express from "express";
import cors from "cors";
import { scrapePriceHistory } from "./scrapers/pricehistory.js";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

// NEW: Real deals API
app.get("/api/deals", async (req, res) => {
  const deals = await scrapePriceHistory();
  res.json({ data: deals });
});

app.listen(PORT, () => {
  console.log("Server running on " + PORT);
});
