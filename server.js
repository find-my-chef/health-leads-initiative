require("dotenv").config();

const path = require("path");
const express = require("express");
const { configured, handleContact } = require("./lib/contact");

const PORT = Number(process.env.PORT || 8080);
const app = express();
app.use(express.json({ limit: "32kb" }));

app.post("/api/contact", async (req, res) => {
  try {
    const result = await handleContact(req.body, req.ip);
    res.status(result.status).json(result.json);
  } catch (err) {
    console.error("Mail send failed:", err.message);
    res.status(502).json({ error: "We could not send your message just now." });
  }
});

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/favicon.ico", (_req, res) => {
  res.sendFile(path.join(__dirname, "favicon.ico"));
});

app.listen(PORT, () => {
  console.log(`Site running at http://127.0.0.1:${PORT}/`);
  if (!configured()) {
    console.log("SMTP is not configured. Copy .env.example to .env and set SMTP_PASS.");
  }
});
