const express = require("express");
const catalyst = require("zcatalyst-sdk-node");

const customerRoutes = require("./routes/customer.routes");

module.exports = (req,res) =>{

	const app = express();
	app.use(express.json());

	//Initilize catalyst for each incoming request
	const catalystApp = catalyst.initialize(req);
	req.catalystApp = catalystApp;

	app.use("/customers/v1",customerRoutes)
	
	//CUSTOMER SERVICE HEALTH CHECK ENDPOINT
	app.get("/health-check",(req,res) =>{
		res.json({
			status: "UP",
			service: "customer_service",
			timestamp: new Date().toISOString()
		 });
	})

	app(req,res);
}