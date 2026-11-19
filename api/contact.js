const { handleContact } = require("../lib/contact");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body;
  try {
    const result = await handleContact(body, req.headers["x-forwarded-for"] || req.socket?.remoteAddress);
    res.status(result.status).json(result.json);
  } catch (err) {
    console.error("Mail send failed:", err.message);
    res.status(502).json({ error: "We could not send your message just now." });
  }
};
