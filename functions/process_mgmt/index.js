const express = require("express");

const branchRoutes = require("./routes/branch.routes");
const cabinetRoutes = require("./routes/cabinet.routes");
const lockerRoutes = require("./routes/locker.routes");
const announcementRoutes = require("./routes/announcement.routes");

const app = express();
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

app.use("/v1/branches", branchRoutes);
app.use("/v1/cabinets", cabinetRoutes);
app.use("/v1/lockers", lockerRoutes);
app.use("/v1/announcements",announcementRoutes);
app.get("/health-check",(req,res) =>{
	res.send("Live");
});

module.exports = app;
