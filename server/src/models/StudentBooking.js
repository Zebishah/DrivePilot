// Compatibility entry point retained for older imports. The canonical schema
// is server/src/models/studentBooking.model.js; keeping this file as a shim
// prevents two definitions from competing for the StudentBooking collection.
module.exports = require("./studentBooking.model");
