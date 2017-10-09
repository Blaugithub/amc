'use strict';

var jsonfile = require('jsonfile')
// azure sdk
var iothub = require('azure-iothub');

var sensorFile = 'sensordata.json'
var twinFile = 'twindoc.json'
var csFile = 'cs.json'
var sensorArray = [], twinArray = [], sysArray = [], tagArray = [], propArray = [];
var deviceId = 'unknown', devcs = '', hubcs = '';
var dev = { "devcs": devcs, "hubcs": hubcs, "deviceId": deviceId }
var status = { 'conn': 'disconnected', 'lsm': 'not started' }

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

    return sensorArray;
})

jsonfile.readFile(csFile, function (err, obj) {
    if (obj) {
        dev = obj;
        devcs = dev.devcs;
        hubcs = dev.hubcs;
        deviceId = dev.deviceId;
    }

})

var getTwinArray = function () {
    return twinArray;
}

var setTwinArray = function (property) {
    var twin = {};
    twin['name'] = property.name;
    twin['type'] = property.type;
    twin['value'] = 'undefined';

    twinArray.push(twin);

    jsonfile.writeFile(twinFile, twinArray, function (err) {
        if (err)
            console.error(err);
        else
            console.log('twin written to file');
    })

    return twinArray;

}

var setTwinValue = function (property) {
    switch (property.type) {
        case 'tag':
            var registry = iothub.Registry.fromConnectionString(hubcs);

            var tag = {};
            tag[property.name] = property.value;

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
                            patch[property.name] = property.value;

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

    return twinArray;

}

var getDev = function () {
    return dev
}

var getDevId = function () {
    return dev.deviceId;
}

var setDev = function (deviceInfo) {
    dev = deviceInfo
    jsonfile.writeFile(csFile, deviceInfo, function (err) {
        if (err) {
            console.error('error writing to file');
        }
        else {
            console.log('connection string written to file');
        }
    })
}

var getSensorArray = function () {
    return sensorArray
}

var setSensorArray = function (sensor) {
    if (sensor.action === 'clear')
        sensorArray = [];

    else {
        var meas = {};
        meas['name'] = sensor.name;
        meas['min'] = sensor.min;
        meas['max'] = sensor.max;
        meas['unit'] = sensor.unit;

        sensorArray.push(meas);

    }
    jsonfile.writeFile(sensorFile, sensorArray, function (err) {
        if (err)
            console.error(err);
        else
            console.log('written to file');
    })

    return sensorArray
}

var setStatus = function (st) {
    status = st;
}

var getStatus = function () {
    return status
}

module.exports.getTwinArray = getTwinArray;
module.exports.setTwinArray = setTwinArray;
module.exports.setTwinValue = setTwinValue;


module.exports.getSensorArray = getSensorArray;
module.exports.setSensorArray = setSensorArray;

module.exports.getDev = getDev;
module.exports.setDev = setDev;

module.exports.getStatus = getStatus;
module.exports.setStatus = setStatus;

module.exports.getDevId = getDevId;
module.exports.setDev = setDev;