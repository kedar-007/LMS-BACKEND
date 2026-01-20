const express = require("express");
const CustomerController = require("../controllers/CustomerController");

const router = express.Router();

// Initilizing the new customer controller

const controller = new CustomerController();

// Browse 
router.get("/branches",controller.getBranches);
router.get("/branches/:branchId/details",controller.getBranchDetails)

//Booking
router.post("/lockers/book",controller.bookLocker);
router.get("/bookings",controller.getMyBookings);
router.get("/bookings/:bookingId", controller.getBookingById);
router.put("/bookings/:bookingId", controller.updateBooking);
router.delete("/bookings/:bookingId", controller.cancelBooking);

// Book Appointment

router.post("/appointment/book",controller.bookAppointmentLocker);
// Get My Appointments
router.get("/appointments", controller.getMyAppointments);
router.get("/appointments/:appointmentId", controller.getAppointmentById);
router.put("/appointments/:appointmentId", controller.updateAppointment);
router.delete("/appointments/:appointmentId", controller.cancelAppointment);

// Customer Analytics
router.get("/analytics", controller.getMyAnalytics);

//Get my Lockers
router.get("/lockers",controller.getMyLockers)
module.exports = router;