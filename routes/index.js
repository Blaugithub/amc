'use strict';
var os = require('os');
var express = require('express');
var router = express.Router();
var jsonfile = require('jsonfile')
var sensorFile = './sensordata.json'
var twinFile = './twindoc.json'
var csFile = './cs.json'
var util = require('../lib/util');

// azure sdk
var iothub = require('azure-iothub');
var clientFromConnectionString = require('azure-iot-device-mqtt').clientFromConnectionString;
var Message = require('azure-iot-device').Message;
var Client = require('azure-iot-device').Client;
var Protocol = require('azure-iot-device-mqtt').Mqtt;

var deviceId = '', devcs = '', hubcs = '', client, status = '';
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
  var dev = util.getDev();
  console.log(dev)
  devcs = dev.devcs;
  hubcs = dev.hubcs;
  deviceId = dev.deviceId;

  if (!deviceId) {
    deviceId = os.hostname();
    console.log('deviceId: ' + deviceId);
    res.render('new', { title: 'Azure MQTT telemetry Simulator', dev: deviceId, devcs: devcs });
  } else {
    res.render('registered', { title: 'Azure MQTT telemetry Simulator', dev: deviceId, devcs: devcs });
  }

});

router.get('/connect', function (req, res, next) {
  res.render('connect', { title: 'Azure MQTT telemetry Simulator', deviceId: deviceId, devcs: devcs });
});

router.post('/connect', function (req, res, next) {
  if (req.body.cs !== '') { // update this device to a new identity and connection string
    devcs = req.body.cs;
    deviceId = devcs.split(';')[1].substring(9);

    cs['devcs'] = devcs;
    cs['deviceId'] = deviceId;
    //persist device connection string
    jsonfile.writeFile(csFile, cs, function (err) {
      if (err)
        console.error(err);
      else
        console.log('connection string written to file');
    })
  }
  util.setStatus({ 'conn': 'connected', 'lsm': lsm })
  res.render('status', { title: 'Azure MQTT telemetry Simulator', status: status, lsm: lsm });
});

router.get('/register', function (req, res, next) {
  res.render('register', { title: 'Azure MQTT telemetry Simulator' });
});

router.post('/register', function (req, res, next) {
  hubcs = req.body.cs;
  var registry = iothub.Registry.fromConnectionString(hubcs);
  if (req.body.devId)
    console.log(req.body.devId);
  else
    console.log(deviceId);

  var device = {
    deviceId: deviceId
  };
  device.deviceId = deviceId;

  var hubName = hubcs.substring(0, hubcs.indexOf(';'));

  registry.create(device, function (err, deviceInfo, regres) {
    if (err) {
      // handle registry error such as device alrady registered
      registry.get(device.deviceId, printDeviceInfo);
      res.render('error', { error: err });
    }
    else {
      if (deviceInfo) {
        var devKey = deviceInfo.authentication.symmetricKey.primaryKey;
        devcs = hubName + ';DeviceId=' + deviceId + ';SharedAccessKey=' + devKey;

        //printDeviceInfo(err, deviceInfo, res);
        cs['devcs'] = devcs;
        cs['deviceId'] = deviceId;
        cs['hubcs'] = hubcs;
        //persist device connection string
        util.setDev(cs);
        util.setStatus({ 'conn': 'connected', 'lsm': lsm })

        res.render('status', { title: 'Azure MQTT telemetry Simulator', status: 'registered', lsm: lsm, deviceId: util.getDevId() });
      }
      else
        res.render('error', { error: err });
    }
  });

});

router.get('/status', function (req, res, next) {
  res.render('status', { title: 'Azure MQTT telemetry Simulator', status: util.getStatus().conn, lsm: util.getStatus().lsm, deviceId: util.getDevId() });
});

router.get('/device', function (req, res, next) {
  res.render('device', { title: 'Azure MQTT telemetry Simulator', deviceId: util.getDevId() });
});

router.get('/sensor', function (req, res, next) {
  var sensorArray = util.getSensorArray();
  res.render('sensor', { title: 'Azure MQTT telemetry Simulator', deviceId: util.getDevId(), sensors: sensorArray });
});

router.post('/sensor', function (req, res, next) {
  var sensorArray = util.setSensorArray(req.body);
  res.render('sensor', { title: 'Azure MQTT telemetry Simulator', deviceId: util.getDevId(), sensors: sensorArray });
});

module.exports = router;
