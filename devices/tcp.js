const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const e = exposes.presets;
const ea = exposes.access;

// TODO: Remove this with the conversion code.
const tuya = require('../lib/tuya');
const TCPTRVErrorStatus = {
    from: function(v) {
        return {
            low_temperature: (v & 1<<1) > 0 ? 'ON' : 'OFF',
            battery_low: (v & 1<<4) > 0,
        };
    },
};

const TCPTRVSystemMode = {
    // to: async function(value) {
    //     switch (value) {
    //     case 'off':
    //         await tuya.sendDataPointBool(entity, tuya.dataPoints.state, false);
    //         break;
    //     case 'heat':
    //         await tuya.sendDataPointBool(entity, tuya.dataPoints.state, true);
    //         await utils.sleep(5000);
    //         await tuya.sendDataPointEnum(entity, tuya.dataPoints.mode, 0 /* manual */);
    //         break;
    //     case 'auto':
    //         await tuya.sendDataPointBool(entity, tuya.dataPoints.state, true);
    //         await utils.sleep(5000);
    //         await tuya.sendDataPointEnum(entity, tuya.dataPoints.mode, 2 /* auto */);
    //         break;
    //     default:
    //         //meta.logger.error(`Unknown state for away mode ${value}.`);
    //         break;
    //     }
    // },
    from: function(value) {
        switch (value) {
        case 0: // manual
            return {system_mode: 'heat', away_mode: 'OFF', setup_mode: 'OFF', preset: 'none'};
        case 1: // away
            return {system_mode: 'heat', away_mode: 'ON', setup_mode: 'OFF', preset: 'away'};
        case 2: // auto
            return {system_mode: 'auto', away_mode: 'OFF', setup_mode: 'OFF', preset: 'none'};
        case 3: // setup
            return {system_mode: 'off', away_mode: 'OFF', setup_mode: 'ON', preset: 'none'};
        default:
            // meta.logger.warn('zigbee-herdsman-converters:TCPThermostat: ' +
            //     `Preset ${value} is not recognized.`);
            break;
        }
    },
};

// const TCPTRVAwayMode = {
//     to: function(value) {
//         switch (value) {
//         case 'ON':
//             await tuya.sendDataPointBool(entity, tuya.dataPoints.state, true);
//             await utils.sleep(5000);
//             await tuya.sendDataPointEnum(entity, tuya.dataPoints.mode, 1 /* away */);
//             break;
//         case 'OFF':
//             await tuya.sendDataPointEnum(entity, tuya.dataPoints.mode, 0 /* manual */);
//             break;
//         }
//     }
// };
//
// const TCPTRVSetupMode = {
//     to: function(value) {}
//         switch (value) {
//         case 'ON':
//             await tuya.sendDataPointBool(entity, tuya.dataPoints.state, true);
//             await utils.sleep(5000);
//             await tuya.sendDataPointEnum(entity, tuya.dataPoints.mode, 3 /* setup */);
//             break;
//         case 'OFF':
//             await tuya.sendDataPointEnum(entity, tuya.dataPoints.mode, 0 /* manual */);
//             break;
//         }
//     }
// };

module.exports = [
    {
        fingerprint: [
            {modelID: 'zk78ptr\u0000', manufacturerName: '_TYST11_czk78ptr'},
        ],
        model: 'TCP Smart TRV',
        vendor: 'TCP',
        description: 'Thermostatic radiator valve',
        whiteLabel: [],
        fromZigbee: [fz.fzDataPoints],
        toZigbee: [
            tz.tcp_thermostat_away_mode,
            tz.tcp_thermostat_system_mode,
            tz.tcp_thermostat_setup_mode,
        ],
        meta: {
            timeout: 10000,
        },
        exposes: [
            e.battery_low(), e.window_detection(), e.child_lock(), e.away_mode(), e.setup_mode(),
            exposes.binary('window', ea.STATE, 'CLOSED', 'OPEN').withDescription('Window status closed or open'),
            exposes.climate()
                .withSetpoint('current_heating_setpoint', 5, 30, 0.5, ea.STATE_SET)
                .withLocalTemperature(ea.STATE)
                .withSystemMode(['heat', 'off', 'auto'], ea.STATE_SET)
                .withRunningState(['idle', 'heat'], ea.STATE),
        ],
        tuyaDatapoints: [
            [1, 'state', tuya.valueConverterBasic.onOff],
            [13, 'error_status', TCPTRVErrorStatus],
            [7, 'child_lock', tuya.valueConverter.lockUnlock],
            [2, 'current_heating_setpoint', tuya.valueConverter.divideBy10],
            [3, 'temperature', tuya.valueConverter.divideBy10],
            [4, 'mode', TCPTRVSystemMode],
            [14, 'running_state', tuya.valueConverterBasic.lookup({'heat': true, 'idle': false})],
            [18, 'window_detection', tuya.valueConverterBasic.onOff],
            [17, 'window', tuya.valueConverterBasic.lookup({'OPEN': true, 'OFF': false})],
        ],
    },
];
