const express = require("express");
const catalystMiddleware = require("./middleware/catalystMiddleware");
const SuperAdminRoutes = require("./routes/superAdmin.routes");
const OrgAdminRoutes = require("./routes/orgAdmin.routes");
const cors = require("cors");
const fileUpload = require("express-fileupload");

const app = express();

app.use(cors({ origin: true, credentials: true }));

// 🔎 Log what arrives
app.use((req, res, next) => {
  console.log("\n==============================");
  console.log(`[IN] ${req.method} ${req.originalUrl}`);
  console.log("Content-Type:", req.headers["content-type"]);
  console.log("Content-Length:", req.headers["content-length"]);
  next();
});

// ✅ Set limit >= your actual uploads (your sample is ~6.3MB)
const MAX_MB = 10;
const MAX_BYTES = MAX_MB * 1024 * 1024;

app.use(
  fileUpload({
    limits: { fileSize: MAX_BYTES },
    abortOnLimit: true,
    createParentPath: true,

    // ✅ When file exceeds limit, respond clearly (instead of "empty req.body")
    limitHandler: (req, res) => {
      console.warn("❌ Upload rejected: file too large");
      return res.status(413).json({
        success: false,
        message: `Logo too large. Max allowed is ${MAX_MB} MB.`,
      });
    },
  })
);

// JSON parsers (fine after fileUpload)
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// 🔎 Log what was parsed
app.use((req, res, next) => {
  console.log(`[PARSED] ${req.method} ${req.originalUrl}`);
  console.log("req.body keys:", req.body ? Object.keys(req.body) : []);
  console.log("req.files keys:", req.files ? Object.keys(req.files) : []);
  if (req.files?.logo) {
    console.log("logo meta:", {
      name: req.files.logo.name,
      size: req.files.logo.size,
      mimetype: req.files.logo.mimetype,
      truncated: req.files.logo.truncated,
    });
  }
  next();
});

app.use(catalystMiddleware);

app.use("/super-admin/v1/", SuperAdminRoutes);
app.use("/org-admin/v1/", OrgAdminRoutes);

app.get("/health-check", (req, res) => {
  return res.status(200).json({ success: true, message: "Live" });
});

app.use((err, req, res, next) => {
  console.error("🔥 Unhandled error:", err);
  return res.status(500).json({
    success: false,
    message: "Unhandled server error",
    error: err?.message,
  });
});

module.exports = app;
