const catalystApp = require("../utils/catalyst");

exports.createLocker = async (req) => {
  const { cabinet_id, label, height, width } = req.body;
  if (!cabinet_id || !label) throw new Error("Missing fields");

  return await catalystApp(req)
    .datastore()
    .table("lockers")
    .insertRow({ cabinet_id, label, height, width, status: "available" });
};

exports.getLockersByCabinet = async (req) => {
  const lockers = await catalystApp(req).datastore().table("lockers").getRows();
  const cabinetId = req.query.cabinet_id;
  return lockers.filter(l => l.cabinet_id === cabinetId);
};

exports.getLockerById = async (req) =>
  catalystApp(req).datastore().table("lockers").getRow(req.params.id);

exports.updateLocker = async (req) =>
  catalystApp(req).datastore().table("lockers").updateRow({ ROWID: req.params.id, ...req.body });

exports.deleteLocker = async (req) =>
  catalystApp(req).datastore().table("lockers").updateRow({ ROWID: req.params.id, status: "inactive" });

exports.bookLocker = async (req) => {
  const { lockerId } = req.params;
  const { booking_id } = req.body;
  await catalystApp(req).datastore().table("lockers")
    .updateRow({ ROWID: lockerId, status: "booked", booking_id });
  return { lockerId, status: "booked" };
};
