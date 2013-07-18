Arduino Power Monitor
=====================

A simple program to monitor the serial output of a CurrentCost 128 power meter and send the data to 
ThingSpeak using an Arduino.

## About

Updated by Michael Sproul for use with Thingspeak and the Python based CLI build tool, `ino`. Based on 
original code by Brian Lee (bleep1)

## Parts List

1. Current Cost 128 power monitor.  http://www.currentcost.com/product-envi.html I got mine from: 
http://www.smartnow.com.au/
2. Arduino.  I used an Etherten from Freetronics. http://www.freetronics.com/products/etherten
3. Home made serial cable, RJ45->Arduino. Blue = Ground, Brown = Serial out (input for the Arduino)
4. Login account at http://www.thingspeak.com
5. This GIT repo
7. Ino from http://inotool.org/

## Libraries

Since changing from Xively to ThingSpeak, no extra libraries are required!

## Building

Add your ThingSpeak API key in the necessary places, modify ino.ini to reflect the Arduino you've got, 
then run `ino build'.

You can also edit `~/.inorc' to set your Ino preferences globally.

## Reference material

* Info on the data from the Cust Cost serial port: http://www.currentcost.com/download/Envi%20XML%20v19%20-%202011-01-11.pdf
* Another guy who did something similar: http://mungbean.org/blog/?p=477
