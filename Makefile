VANILLA_BOARD = atmega328
BRIDGE_BOARD = pro328

.PHONY: bridge vanilla burn clean

bridge:
	ino build -m $(BRIDGE_BOARD) --cppflags="-D_BRIDGE"

vanilla:
	ino build -m $(VANILLA_BOARD)

upload:
	ino upload

burn:
	sudo avrdude -c usbtiny -p m328p -b 57600 -U flash:w:.build/pro328/firmware.hex:i -U efuse:w:0x05:m -U hfuse:w:0xde:m -U lfuse:w:0xff:m

clean:
	ino clean
