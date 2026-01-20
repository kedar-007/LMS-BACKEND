const catalyst = require("zcatalyst-sdk-node");

module.exports = function catalystMiddleware(req, res, next) {
  try {
    // Catalyst MUST be initialized using req
    req.catalystApp = catalyst.initialize(req);
    next();
  } catch (error) {
    console.error("Catalyst init failed:", error);

    // res exists ONLY when Express calls this
    return res.status(500).json({
      success: false,
      message: "Catalyst initialization failed",
    });
  }
};
