var bcrypt = require('bcrypt-nodejs');
var mongoose = require("mongoose");

var user = mongoose.Schema({
    username: {
        type: String,
        unique: true,
        required: true
    },
    password: {
        type: String,
        required: true
    }
});

user.pre('save', function (callback) {
    var usr = this;

    // Break out if the password hasn't changed
    if (!usr.isModified('password')) return callback();

    // Password changed so we need to hash it
    bcrypt.genSalt(5, function (err, salt) {
        if (err) return callback(err);

        bcrypt.hash(user.password, salt, null, function (err, hash) {
            if (err) return callback(err);
            usr.password = hash;
            callback();
        });
    });
});

var User = mongoose.model('User', user);

module.exports.User = User;