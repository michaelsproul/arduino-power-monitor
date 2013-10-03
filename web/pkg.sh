#!/bin/bash

# Package the website files into a handy zip archive.

zip -u -b . arduino-power-site *.js *.html *.css raphael/raphael-min.js raphy-charts/compiled/charts.min.js
