const express = require("express");
const catalystMiddleware = require("./middleware/catalystMiddleware");
const SuperAdminRoutes = require("./routes/superAdmin.routes")
const OrgAdminRoutes = require("./routes/orgAdmin.routes");
const cors = require("cors");

const app = express();

app.use(express.json());
app.use(cors())

// Catalyst must be BEFORE routes
app.use(catalystMiddleware);

//Super Admin Routes
app.use("/super-admin/v1/",SuperAdminRoutes);

// Org Admin Routes

app.use("/org-admin/v1/",OrgAdminRoutes);

app.get("/health-check", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Live",
  });
});

module.exports = app;
