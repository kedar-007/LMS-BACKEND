const express = require("express");
const catalyst = require("zcatalyst-sdk-node");

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  req.catalystApp = catalyst.initialize(req);
  next();
});

const routes = require("./routes");
app.use("/lms/v1", routes);

module.exports = app;
