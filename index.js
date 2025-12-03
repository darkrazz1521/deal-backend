import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Simple health check
app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "Backend running successfully" });
});

// (TEMPORARY) Dummy deals endpoint
// Next steps: We will replace this with real scraper results
app.get("/api/deals", (req, res) => {
  res.json({
    data: [
      {
        id: "temp1",
        title: "Test Deal",
        description: "This is only a dummy deal",
        link: "https://amazon.in/",
        store: "amazon",
        image: "https://m.media-amazon.com/images/I/71qWQx0P9-L._SL1500_.jpg",
        price: 100,
        old_price: 200,
        discount_percent: 50
      }
    ]
  });
});

// Start server
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
