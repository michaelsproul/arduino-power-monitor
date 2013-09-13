Arduino Power Monitor
=====================

This project consists of two separate programs to ease the monitoring of household electricity usage.

1. A simple C program for Arduino, which parses XML data from a Current Cost power meter & uploads to Thingspeak.
2. A website that uses the data from Thingspeak to create graphs & calculate energy usage.

## Parts List

1. Current Cost 128 power monitor.  http://www.currentcost.com/product-envi.html I got mine from: 
http://www.smartnow.com.au/
2. Arduino.  I used an Etherten from Freetronics. http://www.freetronics.com/products/etherten
3. Home made serial cable, RJ45->Arduino. Blue = Ground, Brown = Monitor output/Arduino input
4. Login account at http://www.thingspeak.com
5. This Git repo
7. Ino from http://inotool.org/

## Using a Current Cost Bridge

I've now switched to using a hacked Current Cost network bridge as my Arduino. This required some changes to the board settings and serial configuration so I've moved the old Arduino code to a "vanilla" branch. If you've got a regular Arduino, use the vanilla branch.

I'm currently uploading code using an AVR programmer (the USBTiny ISP) and avrdude. The neccessary settings are in the Makefile, so you can just run `ino build && make burn`.

I roughly followed [these instructions](http://john.crouchley.com/blog/archives/722) to hack the bridge.

## Libraries

Since changing from Xively to ThingSpeak, no extra libraries are required!

The web page uses a bunch of great Javascript libraries, notably Raphael & Raphy Charts for the graphs.

## Building

Add your ThingSpeak API key in the necessary place(s), modify ino.ini to reflect the Arduino you've 
got, and run `ino build && ino upload && ino serial`.

You can also edit `~/.inorc` to set your Ino preferences globally.

## Testing

If you want to test your setup without parsing the data or uploading it to ThingSpeak you can build and 
run the project in the serial-test directory. Run `ino build && ino upload && ino serial` from the 
serial-test directory and you'll see the XML output from the meter (hopefully).

## Reference material

* [Current Cost XML specification](http://www.currentcost.com/download/Envi%20XML%20v19%20-%202011-01-11.pdf)
* [Another guy who did something similar](http://mungbean.org/blog/?p=477)
* [Some wicked CC bridge hacking](http://john.crouchley.com/blog/archives/722)

## Authors

Website & Thingspeak upload capability by Michael Sproul.

Based on [original code](https://github.com/bleep1/CurrentCostToCosmViaArduino) by Brian Lee (bleep1)
