'use strict';
var env = require('dotenv').config();
var express = require('express');
var router = express.Router();
var jsonfile = require('jsonfile')
var sensorFile = './sensordata.json'
var twinFile = './twindoc.json'
var csFile = './cs.json'

// azure sdk
var iothub = require('azure-iothub');
var clientFromConnectionString = require('azure-iot-device-mqtt').clientFromConnectionString;
var Message = require('azure-iot-device').Message;
var Client = require('azure-iot-device').Client;
var Protocol = require('azure-iot-device-mqtt').Mqtt;

var deviceId, devcs = '', hubcs = '', client, status = 'disconnected';
var cs = { "devcs": devcs, "hubcs": hubcs }
var myTimer, lsm = 'no telemetry started', interval = 60000;
var sensorArray = [], twinArray = [], sysArray = [], tagArray = [], propArray = [];

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

function composeMessage() {
  var msg = {};
  for (var i = 0; i < sensorArray.length; i++)
    msg[sensorArray[i].name] = Math.random() * (sensorArray[i].max - sensorArray[i].min) + sensorArray[i].min;

  return msg;
}
//routing
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Azure MQTT telemetry Simulator', dev: deviceId });
});

router.get('/connect', function (req, res, next) {
  res.render('connect', { title: 'Azure MQTT telemetry Simulator', deviceId: deviceId, devcs: devcs });
});

router.post('/connect', function (req, res, next) {
  devces = req.body.cs;
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

    status = 'registered';

  });
  res.render('status', { title: 'Azure MQTT telemetry Simulator', status: status, lsm: lsm });

});

router.get('/status', function (req, res, next) {
  res.render('status', { title: 'Azure MQTT telemetry Simulator', status: status, lsm: lsm });
});

router.get('/tele', function (req, res, next) {
  res.render('tele', { title: 'Azure MQTT telemetry Simulator', deviceId: deviceId });
});

router.get('/device', function (req, res, next) {
  res.render('device', { title: 'Azure MQTT telemetry Simulator', deviceId: deviceId });
});

router.get('/message', function (req, res, next) {
  res.render('message', { title: 'Azure MQTT telemetry Simulator', deviceId: deviceId, sensors: sensorArray });
});

router.get('/twin', function (req, res, next) {
  res.render('twin', { title: 'Azure MQTT telemetry Simulator', deviceId: deviceId, twins: twinArray });
});

router.post('/twin', function (req, res, next) {
  var twin = {};
  twin['name'] = req.body.name;
  twin['type'] = req.body.type;
  twin['value'] = 'undefined';

  twinArray.push(twin);

  jsonfile.writeFile(twinFile, twinArray, function (err) {
    if (err)
      console.error(err);
    else
      console.log('twin written to file');
  })

  res.render('twin', { title: 'Azure MQTT telemetry Simulator', deviceId: deviceId, twins: twinArray });
});

router.post('/update_twin', function (req, res, next) {
  switch (req.body.type) {
    case 'tag':
      var registry = iothub.Registry.fromConnectionString(hubcs);

      var tag = {};
      tag[req.body.name] = req.body.value;

      registry.getTwin(deviceId, function (err, twin) {
        if (err) {
          console.error(err.constructor.name + ': ' + err.message);
        } else {
          var patch = {
            tags: tag
          }
        };
        twin.update(patch, function (err) {
          if (err) {
            console.error('Could not update twin: ' + err.constructor.name + ': ' + err.message);
          } else {
            console.log(twin.deviceId + ' twin updated successfully');
          }
        });
      });
      break;
    case 'property':
      var client = Client.fromConnectionString(devcs, Protocol);
      client.open(function (err) {
        if (err) {
          console.error('could not open IotHub client');
        } else {
          console.log('client opened');

          client.getTwin(function (err, twin) {
            if (err) {
              console.error('could not get twin');
            } else {
              var patch = {};
              patch[req.body.name] = req.body.value;

              twin.properties.reported.update(patch, function (err) {
                if (err) {
                  console.error('could not update twin');
                } else {
                  console.log('twin state reported');
                }
              });
            }
          });
        }
      });
      break;
  }

  res.render('twin', { title: 'Azure MQTT telemetry Simulator', deviceId: deviceId, twins: twinArray, hubcs: hubcs });
});



router.post('/tele', function (req, res, next) {
  var new_lsm = '';

  switch (req.body.action) {
    case 'start':
      var client = clientFromConnectionString(devcs);
      client.open(function (err) {
        if (err) {
          var msg = 'Could not connect: ' + err;
        } else {
          // Create a message and send it to the IoT Hub at interval
          interval = req.body.interval;
          console.log('setting telemetry at: ' + interval + ' ms');
          myTimer = setInterval(function () {
            var data = JSON.stringify(composeMessage());

            var message = new Message(data);
            client.sendEvent(message, printResultFor('send'));
            lsm = new Date(Date.now()).toUTCString();
            console.log(lsm);

          }, interval);
        }
      });
      res.render('device', { title: 'Azure MQTT telemetry Simulator', deviceId: deviceId, lsm: lsm });
      break;
    case 'replay':
      //implement
      res.render('device', { title: 'Azure MQTT telemetry Simulator', deviceId: deviceId, lsm: lsm });
      break;
    case 'stop':
      clearInterval(myTimer);
      res.render('device', { title: 'Azure MQTT telemetry Simulator', deviceId: deviceId, lsm: lsm });
      break;
    case 'fault':
      res.send('not implemented');
      break;
    case 'refresh':
      res.render('device', { title: 'Azure MQTT telemetry Simulator', deviceId: deviceId, lsm: lsm });
      break;
  }
});

router.post('/message', function (req, res, next) {
  console.log(req.body);
  if (req.body.action === 'clear')
    sensorArray = [];

  else {
    var meas = {};
    meas['name'] = req.body.name;
    meas['min'] = req.body.min;
    meas['max'] = req.body.max;
    meas['unit'] = req.body.unit;

    sensorArray.push(meas);

  }
  jsonfile.writeFile(sensorFile, sensorArray, function (err) {
    if (err)
      console.error(err);
    else
      console.log('written to file');
  })

  res.render('message', { title: 'Azure MQTT telemetry Simulator', deviceId: deviceId, sensors: sensorArray });
});

module.exports = router;
