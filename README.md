Arduino Power Monitor
================================

A simple program to monitor the serial output of a CurrentCost 128 power meter and send the data to *Xively* using an Arduino.

## About

Updated by Michael Sproul for use with Xively (the service formerly known as Cosm) and the Python based CLI build tool, `ino`. Based on original code by Brian Lee (bleep1)

## Parts List
1. Current Cost 128 power monitor.  http://www.currentcost.com/product-envi.html  I got mine from:  http://www.smartnow.com.au/ 
2. Arduino.  I used an Etherten from Freetronics:  http://www.freetronics.com/products/etherten
3. A home made serial cable, RJ45->Arduino. Blue = Ground, Brown = Serial out
4. A login account at www.xively.com
5. This GIT repo
6. A few Arduino libraries
7. `ino` from http://inotool.org/

## Libraries
Clone each libary into its own folder in `/usr/share/arduino/libraries`

* The Xively library from https://github.com/xively/xively_arduino
* The BufferedSerial library from https://code.google.com/p/arduino-buffered-serial/

The web page also uses the XivelyJS library (http://xively.github.io/xively-js/) and JQuery

## Building
Add your Xively feed details in the necessary places, modify ino.ini to reflect the arduino you've got, then run `ino build`.

## Reference material
* Info on the data from the Cust Cost serial port: http://www.currentcost.com/download/Envi%20XML%20v19%20-%202011-01-11.pdf
* Another guy who did something similar: http://mungbean.org/blog/?p=477


