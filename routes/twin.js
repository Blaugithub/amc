'use strict';
var env = require('dotenv').config();
var express = require('express');
var router = express.Router();
var util = require('../lib/util');

// azure sdk
var iothub = require('azure-iothub');
var clientFromConnectionString = require('azure-iot-device-mqtt').clientFromConnectionString;
var Message = require('azure-iot-device').Message;
var Client = require('azure-iot-device').Client;
var Protocol = require('azure-iot-device-mqtt').Mqtt;

var deviceId = 'unknown', devcs = '', hubcs = '', client, status = 'disconnected';
var cs = { "devcs": devcs, "hubcs": hubcs }
var myTimer, lsm = 'no telemetry started', interval = 60000;
var sensorArray = [], twinArray = [], sysArray = [], tagArray = [], propArray = [];

// auxiliary functions
function printResultFor(op) {
    return function printResult(err, res) {
        if (err) console.log(op + ' error: ' + err.toString());
        if (res) console.log(op + ' status: ' + res.constructor.name);
    };
}

function printDeviceInfo(err, deviceInfo, res) {
    if (deviceInfo) {
        deviceKey = deviceInfo.authentication.symmetricKey.primaryKey;
    }
}

//routing
router.get('/', function (req, res, next) {
    var twinArray = util.getTwinArray();
    res.render('twin', { title: 'Azure MQTT telemetry Simulator', deviceId: util.getDevId(), twins: twinArray });
});

router.post('/', function (req, res, next) {
    var twinArray = util.setTwinArray(req.body);
    res.render('twin', { title: 'Azure MQTT telemetry Simulator', deviceId: util.getDevId(), twins: twinArray });
});

router.post('/update', function (req, res, next) {
    // find the type in array
    var twinArray = util.setTwinValue(req.body);
    res.render('twin', { title: 'Azure MQTT telemetry Simulator', deviceId: util.getDevId(), twins: twinArray, hubcs: hubcs });
});



module.exports = router;
