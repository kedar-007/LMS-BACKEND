const express = require("express");
const catalystMiddleware = require("./middleware/catalystMiddleware");
const SuperAdminRoutes = require("./routes/superAdmin.routes");
const OrgAdminRoutes = require("./routes/orgAdmin.routes");
const cors = require("cors");
const fileUpload = require("express-fileupload");

const app = express();

// ✅ REQUIRED for multipart/form-data (FILES + TEXT)
app.use(
  fileUpload({
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    abortOnLimit: true,
    createParentPath: true
  })
);

// ✅ For JSON APIs
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors());

// Catalyst middleware
app.use(catalystMiddleware);

// Routes
app.use("/super-admin/v1/", SuperAdminRoutes);
app.use("/org-admin/v1/", OrgAdminRoutes);

app.get("/health-check", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Live"
  });
});

module.exports = app;
