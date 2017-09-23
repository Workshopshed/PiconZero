// NodeJS library for 4tronix Picon Zero
// Ported from Python

/* Picon Zero CONTROL
-
- 2 motors driven by H-Bridge (DRV8833): (4 outputs)
- 6 general purpose outputs: Can be LOW, HIGH, PWM, Servo or WS2812B
- 4 general purpose inputs: Can be Analog, Digital or the temperature sensor DS18B20
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
    this.OutMode = {
        Digital: 0, //  Byte    0 is OFF, 1 is ON
        PWM: 1,     //  Byte    0 to 100 percentage of ON time
        Servo: 2,   //  Byte    -100 to + 100 Position in degrees
        WS2812B:3   //  4 Bytes 0:Pixel ID, 1:Red, 2:Green, 3:Blue
    }

    this.InMode = {
        Digital: 0,
        Analog:  1,
        DS18B20: 2
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
    //Change the following to /dev/i2c-0 for early Pi models
    var bus = new i2c(pzaddr , {device: '/dev/i2c-1'});

    //---------------------------------------------;
    // Initialise the Board (same as cleanup)

    //TODO: Port the repeat mechanism with a wait

    this.init = function (debug=false) {
        DEBUG = debug;
        if (DEBUG) { console.log(bus); }

        bus.writeBytes(Commands.RESET, [0],function(err) {
            if (err) {
                    throw(err);
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
                    console.log ('Error in getRevision() %s', err);
            }
        });
        return [rval[1],rval[0]];
    }

    // Set configuration of selected output
    // 0: Digital On/Off, 1: PWM, 2: Servo, 3: WS2812B
    this.setOutputConfig = function (output, mode) {
        if (output < 0 || output > 5) {  throw(new Error("Invalid output channel")); }
        if (mode < 0 || mode > 3) { throw(new Error("Invalid output mode")); }

        bus.writeBytes(Commands.OUTCFG0 + output, [mode],function(err) {
                if (err) {
                        throw(err);
                }
            });
    }

    // Set configuration of selected input channel
    // 0: Digital, 1: Analog, 2: DS18B20
    this.setInputConfig = function(channel, mode, pullup = false) {
        if (channel < 0 || channel > 3) {  throw(new Error("Invalid input channel")); }
        if (mode < 0 || mode > 2) { throw(new Error("Invalid input mode")); }

        if (mode == 0 && pullup == true) {
            mode = 128;
        }
        bus.writeBytes(Commands.INCFG0 + channel, [mode],function(err) {
                if (err) {
                        throw(err);
                }
            });
    }

    // Read data for selected input channel (analog or digital)
    // Channel is in range 0 to 3
    this.readInput = function (channel) {
        if (channel < 0 || channel > 3) {  throw(new Error("Invalid input channel")); }

        var rval = bus.readBytes(Registers.Input0_Data+channel,2,function(err) {
            if (err) {
                    console.log ('Error in readChannel()');
                    console.log (err);
            }
        });
        // Data is split into 2 8bit bytes, low then high, should be values 1 to 1023
        // Have seen it glitch and return very high values though
        return (rval[1] << 8) + rval[0];
    }

    // Set output data for selected output channel
    // Mode  Name    Type    Values
    // 0     On/Off  Byte    0 is OFF, 1 is ON
    // 1     PWM     Byte    0 to 100 percentage of ON time
    // 2     Servo   Byte    Position 0 to 180 degrees (Python doc does not seem to be right)
    // 3     WS2812B 4 Bytes 0:Pixel ID, 1:Red, 2:Green, 3:Blue

    this.setOutput = function (channel, value) {
        if (channel < 0 || channel > 5)  {  throw(new Error("Invalid output channel")); }

        bus.writeBytes(Commands.OUTPUT0 + channel, [value],function(err) {
            if (err) {
                throw(err);
            }
        });
    }

    // motor must be in range 0..1
    // value must be in range -128 - +127
    // values of -127, -128, +127 are treated as always ON,, no PWM
    this.setMotor = function (motor, speed) {
        if (motor < 0 || motor > 1) {  throw(new Error("Invalid motor channel")); }
        if (speed<-128 || speed > 127) {  throw(new Error("Invalid motor speed")); }

        bus.writeBytes(Commands.MOTORA + motor, [speed],function(err) {
        if (err) {
                throw(err);
        }
        });
    }

    this.forward = function(speed) {
        this.setMotor (0, speed);
        this.setMotor (1, speed);
    }

    this.reverse = function (speed) {
        this.setMotor (0, -speed);
        this.setMotor (1, -speed);
    }

    this.spinLeft = function (speed) {
        this.setMotor (0, -speed);
        this.setMotor (1, speed);
    }

    this.spinRight = function (speed) {
        this.setMotor (0, speed);
        this.setMotor (1, -speed);
    }

    this.stop = function() {
        this.setMotor (0, 0)
        this.setMotor (1, 0)
    }

    //Todo: Pixel functions
}

module.exports = new pz();
