// NodeJS library for 4tronix Picon Zero
// Ported from Python

/* Picon Zero CONTROL
- 
- 2 motors driven by H-Bridge: (4 outputs)
- 6 general purpose outputs: Can be LOW, HIGH, PWM, Servo or WS2812B
- 4 general purpose inputs: Can be Analog or Digital
-
*/

function pz() {

    //Read Only Registers - These are WORDs
    var Registers = {
        Revision: 0,    //      Word  Low Byte: Firmware Build, High Byte: PCB Revision
        Input0_Data: 1, //      Word  0 or 1 for Digital, 0..1023 for Analog
        Input1_Data: 2, //      Word  0 or 1 for Digital, 0..1023 for Analog
        Input2_Data: 3, //      Word  0 or 1 for Digital, 0..1023 for Analog
        Input3_Data: 4  //      Word  0 or 1 for Digital, 0..1023 for Analog
    }
    //Data Values for Output Data Registers
    var OutMode = {
        Digital: 0, //  Byte    0 is OFF, 1 is ON
        PWM: 1,     //  Byte    0 to 100 percentage of ON time
        Servo: 2,   //  Byte    -100 to + 100 Position in degrees
        WS2812B:3   //  4 Bytes 0:Pixel ID, 1:Red, 2:Green, 3:Blue

    }

    var InMode = {
        Digital: 0, 
        Analog:  1,
        DS18B20: 2,
        DHT11: 3
        // (NB. 0x80 is Digital input with pullup)
    }

    // Each I2C packet comprises a Register/Command Pair of bytes
    var Commands = {
        MOTORA: 0,      // Byte  -100 (full reverse) to +100 (full forward)
        MOTORB: 1,      // Byte  -100 (full reverse) to +100 (full forward)
        //Outputs 0 to 5 are available
        OUTCFG0: 2,     // Byte (OutMode) 
        OUTPUT0: 8,     // Byte  Data value(s)
        //Inputs 0 to 3 are available
        INCFG0: 14,     // Byte (InMode)
        SETBRIGHT: 18,  // Byte  0..255. Scaled max brightness (default is 40)
        UPDATENOW: 19,  // Byte  dummy value - forces updating of neopixels
        RESET: 20       // Byte  dummy value - resets all values to initial state
    };

    // General variables
    var DEBUG = false;
    var RETRIES = 10 ; // max number of retries for I2C calls

    var i2c = require('i2c');
    var pzaddr = 0x22; // I2C address of Picon Zero
    var bus = new i2c(pzaddr , {device: '/dev/i2c-1'}); 

    //---------------------------------------------;
    // Initialise the Board (same as cleanup)

    //TODO: Port the repeat mechanism

    this.init = function (debug=false) {
        DEBUG = debug;
        if (DEBUG) { console.log(bus); }

        bus.writeBytes(Commands.RESET, [0],function(err) {
            if (err) {
                    console.log('Error in init() %s',err);
                    }
        });
    }

    //---------------------------------------------;
    // Cleanup the Board (same as init)
    this.cleanup = function () {
        bus.writeBytes (Commands.RESET,[0], function(err) {
            if (err) {
                console.log ('Error in cleanup() %s', err);
            }
        }
        );
    }

    this.getRevision = function () {
        var rval = bus.readBytes(Registers.Revision,2,function(err) {
            if (err) {
                    console.log ('Error in getRevision()');
            }
        });
        return [rval[1],rval[0]];
    }
}

module.exports = new pz();