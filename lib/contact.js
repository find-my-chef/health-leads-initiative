const nodemailer = require("nodemailer");

const MAIL_TO = () => process.env.MAIL_TO || "hello@healthleadsinitiative.com";
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

async function handleContact(body, ip) {
  const input = body || {};
  if (input.company) return { status: 200, json: { ok: true } };

  const name = String(input.name || "").trim();
  const email = String(input.email || "").trim();
  const organisation = String(input.organisation || "").trim();
  const subject = String(input.subject || "").trim();
  const message = String(input.message || "").trim();

  if (!name || name.length > 120) {
    return { status: 400, json: { error: "Please enter your name." } };
  }
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 200) {
    return { status: 400, json: { error: "Please enter a valid email address." } };
  }
  if (!SUBJECTS.has(subject)) {
    return { status: 400, json: { error: "Please choose a subject." } };
  }
  if (message.length < 10 || message.length > 5000) {
    return { status: 400, json: { error: "Please enter a message of at least 10 characters." } };
  }
  if (organisation.length > 200) {
    return { status: 400, json: { error: "Organisation name is too long." } };
  }
  if (limited(ip || "unknown")) {
    return { status: 429, json: { error: "Please wait a few minutes before sending another message." } };
  }
  if (!configured()) {
    return { status: 503, json: { error: "Email is not configured yet." } };
  }

  await mailer().sendMail({
    from: process.env.SMTP_USER,
    to: MAIL_TO(),
    replyTo: email,
    subject: `[Health Leads Initiative] ${subject}`,
    text: `Name: ${name}\nEmail: ${email}\nOrganisation: ${organisation || "-"}\nSubject: ${subject}\n\n${message}`,
  });
  return { status: 200, json: { ok: true } };
}

module.exports = { configured, handleContact };
