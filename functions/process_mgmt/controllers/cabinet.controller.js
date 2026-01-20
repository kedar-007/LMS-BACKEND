const service = require("../services/cabinet.service");

/* ===============================
   CREATE CABINET + LOCKERS
================================ */
exports.createCabinetWithLockers = async (req, res) => {
  try {
    const data = await service.createCabinetWithLockers(req);

    res.status(201).json({
      success: true,
      message: "Cabinet and lockers created successfully",
      data
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
};

/* ===============================
   GET CABINETS BY BRANCH
================================ */
exports.getCabinetsByBranch = async (req, res) => {
  try {
    const data = await service.getCabinetsByBranch(req);

    res.json({
      success: true,
      message: "Cabinets fetched successfully",
      data
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
};

/* ===============================
   GET CABINET BY ID
================================ */
exports.getCabinetById = async (req, res) => {
  try {
    const data = await service.getCabinetWithLockers(req);

    res.json({
      success: true,
      message: "Cabinet fetched successfully",
      data
    });
  } catch (err) {
    res.status(404).json({
      success: false,
      message: err.message
    });
  }
};

/* ===============================
   UPDATE CABINET
================================ */
exports.updateCabinet = async (req, res) => {
  try {
    const data = await service.updateCabinet(req);

    res.json({
      success: true,
      message: "Cabinet updated successfully",
      data
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
};

/* ===============================
   DELETE CABINET (SOFT)
================================ */
exports.deleteCabinet = async (req, res) => {
  try {
    const data = await service.deleteCabinet(req);

    res.json({
      success: true,
      message: "Cabinet deleted successfully",
      data
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
};
