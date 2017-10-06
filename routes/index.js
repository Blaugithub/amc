'use strict';
var env = require('dotenv').config();
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

var deviceId = 'unknown', devcs = '', hubcs = '', client, status = '';
var cs = { "devcs": devcs, "hubcs": hubcs }
var myTimer, lsm = 'no telemetry started', interval = 60000;
var sensorArray = [], twinArray = [], sysArray = [], tagArray = [], propArray = [];
/*
jsonfile.readFile(twinFile, function (err, obj) {
  if (obj) {
    twinArray = obj;
    for (var i = 0; i < obj.length; i++) {
      switch (obj[i].type) {
        case 'system':
          sysArray.push(obj[i]);
          break;
        case 'tag':
          tagArray.push(obj[i]);
          break;
        case 'property':
          propArray.push(obj[i]);
          break;
      }
    }
  }
})

jsonfile.readFile(sensorFile, function (err, obj) {
  if (obj)
    sensorArray = obj;
})

jsonfile.readFile(csFile, function (err, obj) {
  if (obj) {
    cs = obj;
    devcs = cs.devcs;
    hubcs = cs.hubcs;
    deviceId = cs.deviceId;
  }
})
*/


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
  devcs = dev.devcs;
  hubcs = dev.hubcs;
  deviceId = dev.deviceId;
  console.log('deviceId. ' + deviceId)
  if (!deviceId)
    deviceId = 'unknown'
  
  res.render('index', { title: 'Azure MQTT telemetry Simulator', dev: deviceId, devcs: devcs });
});

router.get('/connect', function (req, res, next) {
  res.render('connect', { title: 'Azure MQTT telemetry Simulator', deviceId: deviceId, devcs: devcs });
});

router.post('/connect', function (req, res, next) {
  console.log(req.body.cs)
  if (req.body.cs !== '') {
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
  status = 'connected';
  res.render('status', { title: 'Azure MQTT telemetry Simulator', status: status, lsm: lsm });
});

router.get('/register', function (req, res, next) {
  res.render('register', { title: 'Azure MQTT telemetry Simulator' });
});

router.post('/register', function (req, res, next) {

  hubcs = req.body.cs;
  var registry = iothub.Registry.fromConnectionString(hubcs);
  deviceId = req.body.devId;
  var device = new iothub.Device(null);
  device.deviceId = deviceId;

  var hubName = hubcs.substring(0, hubcs.indexOf(';'));

  registry.create(device, function (err, deviceInfo, res) {
    if (err)
      registry.get(device.deviceId, printDeviceInfo);
    if (deviceInfo) {
      var devKey = deviceInfo.authentication.symmetricKey.primaryKey;
      devcs = hubName + ';DeviceId=' + deviceId + ';SharedAccessKey=' + devKey;

      //printDeviceInfo(err, deviceInfo, res);
      cs['devcs'] = devcs;
      cs['deviceId'] = deviceId;
      cs['hubcs'] = hubcs;
      //persist device connection string
      jsonfile.writeFile(csFile, cs, function (err) {
        if (err)
          console.error(err);
        else
          console.log('connection string written to file');
      })
    }
  });
  res.render('status', { title: 'Azure MQTT telemetry Simulator', status: 'registered', lsm: lsm, deviceId: util.getDevId() });

});

router.get('/status', function (req, res, next) {
  res.render('status', { title: 'Azure MQTT telemetry Simulator', status: status, lsm: lsm, deviceId: util.getDevId() });
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
