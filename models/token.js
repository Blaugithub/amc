var crypto = require('crypto');
var mongoose = require("mongoose");

var access = mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    clientId: {
        type: String,
        required: true
    },
    token: {
        type: String,
        unique: true,
        required: true
    },
    created: {
        type: Date,
        default: Date.now
    }
});
var AccessToken = mongoose.model('AccessToken', access);

var refresh = mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    clientId: {
        type: String,
        required: true
    },
    token: {
        type: String,
        unique: true,
        required: true
    },
    created: {
        type: Date,
        default: Date.now
    }
});
var RefreshToken = mongoose.model('RefreshToken', refresh);


module.exports.AccessToken = AccessToken;
module.exports.RefreshToken = RefreshToken;