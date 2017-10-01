var mongoose = require("mongoose");

var payload = mongoose.Schema({
    data: String,
    timestamp: Number
});
var Payload = mongoose.model('Payload', payload);

module.exports.Payload = Payload;