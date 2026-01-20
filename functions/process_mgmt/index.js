const express = require("express");

const branchRoutes = require("./routes/branch.routes");
const cabinetRoutes = require("./routes/cabinet.routes");
const lockerRoutes = require("./routes/locker.routes");

const app = express();
app.use(express.json());

app.use("/v1/branches", branchRoutes);
app.use("/v1/cabinets", cabinetRoutes);
app.use("/v1/lockers", lockerRoutes);
app.get("/health-check",(req,res) =>{
	res.send("Live");
});

module.exports = app;
