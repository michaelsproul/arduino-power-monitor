.PHONY: burn

burn:
	sudo avrdude -c usbtiny -p m328p -b 57600 -U flash:w:.build/pro328/firmware.hex:i -U efuse:w:0x05:m -U hfuse:w:0xde:m -U lfuse:w:0xff:m
