const CustomerService = require("../services/CustomerService");

class CustomerController {
  async getBranches(req, res) {
    const data = await CustomerService.getBranches(req);
    res.status(200).json({
      success: true,
      data,
    });
  }

  async getBranchDetails(req, res) {
    const data = await CustomerService.getBranchDetails(req);
    res.status(200).json({
      success: true,
      data,
    });
  }

  async bookLocker(req, res) {
    try {
      const result = await CustomerService.bookLocker(req);

      if (result.success === false) {
        return res.status(200).json(result);
      }

      return res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  }

  async getMyBookings(req, res) {
    const data = await CustomerService.getMyBookings(req, res);
    res.status(200).json({
      sucess: true,
      data,
    });
  }

  //Book Apointment

  async bookAppointmentLocker(req, res) {
    const data = await CustomerService.bookAppointment(req, res);
    res.status(201).json({
      sucess: true,
      message: "Appointment booking successfull",
      data,
    });
  }

  //get My lockers
  async getMyLockers(req, res) {
    const data = await CustomerService.getMyLockers(req, res);
    res.status(200).json({
      success: true,
      lockers: data,
    });
  }

  async getMyAppointments(req, res) {
    const data = await CustomerService.getMyAppointments(req, res);
    res.status(200).json({
      success: true,
      lockers: data,
    });
  }

  async getBookingById(req, res) {
    const data = await CustomerService.getBookingById(req);
    res.status(200).json({ success: true, data });
  }

  async updateBooking(req, res) {
    const data = await CustomerService.updateBooking(req);
    res.status(200).json({ success: true, data });
  }

  async cancelBooking(req, res) {
    const data = await CustomerService.cancelBooking(req);
    res.status(200).json({ success: true, data });
  }

  async getAppointmentById(req, res) {
    const data = await CustomerService.getAppointmentById(req);
    res.status(200).json({ success: true, data });
  }

  async updateAppointment(req, res) {
    const data = await CustomerService.updateAppointment(req);
    res.status(200).json({ success: true, data });
  }

  async cancelAppointment(req, res) {
    const data = await CustomerService.cancelAppointment(req);
    res.status(200).json({ success: true, data });
  }

  //GET customer analytics
  async getMyAnalytics(req, res) {
    const data = await CustomerService.getMyAnalytics(req);

    res.status(200).json({
      success: true,
      analytics: data,
    });
  }
}

module.exports = CustomerController;
