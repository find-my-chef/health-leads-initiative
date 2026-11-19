require("dotenv").config();

const path = require("path");
const express = require("express");
const nodemailer = require("nodemailer");

const PORT = Number(process.env.PORT || 8080);
const MAIL_TO = process.env.MAIL_TO || "hello@healthleadsinitiative.com";
const SUBJECTS = new Set([
  "General Enquiry",
  "Partnership Opportunity",
  "Volunteering",
  "Project Enquiry",
  "Media Enquiry",
  "Other",
]);

const hits = new Map();

function configured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function mailer() {
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = process.env.SMTP_SECURE
    ? process.env.SMTP_SECURE === "true"
    : port === 465;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

function limited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  if (recent.length >= 5) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

const app = express();
app.use(express.json({ limit: "32kb" }));

app.post("/api/contact", async (req, res) => {
  const body = req.body || {};
  if (body.company) return res.json({ ok: true });

  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim();
  const organisation = String(body.organisation || "").trim();
  const subject = String(body.subject || "").trim();
  const message = String(body.message || "").trim();

  if (!name || name.length > 120) {
    return res.status(400).json({ error: "Please enter your name." });
  }
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 200) {
    return res.status(400).json({ error: "Please enter a valid email address." });
  }
  if (!SUBJECTS.has(subject)) {
    return res.status(400).json({ error: "Please choose a subject." });
  }
  if (message.length < 10 || message.length > 5000) {
    return res.status(400).json({ error: "Please enter a message of at least 10 characters." });
  }
  if (organisation.length > 200) {
    return res.status(400).json({ error: "Organisation name is too long." });
  }
  if (limited(req.ip)) {
    return res.status(429).json({ error: "Please wait a few minutes before sending another message." });
  }
  if (!configured()) {
    return res.status(503).json({ error: "Email is not configured yet." });
  }

  try {
    await mailer().sendMail({
      from: process.env.SMTP_USER,
      to: MAIL_TO,
      replyTo: email,
      subject: `[Health Leads Initiative] ${subject}`,
      text: `Name: ${name}\nEmail: ${email}\nOrganisation: ${organisation || "-"}\nSubject: ${subject}\n\n${message}`,
    });
    res.json({ ok: true });
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
