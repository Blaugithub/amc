var crypto = require('crypto');
var mongoose = require("mongoose");

var client = mongoose.Schema({
    name: {
        type: String,
        unique: true,
        required: true
    },
    clientId: {
        type: String,
        unique: true,
        required: true
    },
    clientSecret: {
        type: String,
        required: true
    }
});


var Client = mongoose.model('Client', client);

module.exports.Client = Client;