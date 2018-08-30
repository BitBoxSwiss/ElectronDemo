#!/bin/bash
docker run -it \
        -v /dev/bus/usb:/dev/bus/usb \
        -v /tmp/.X11-unix:/tmp/.X11-unix:ro \
        --env="XAUTHORITY=$XAUTHORITY" \
        --env="DISPLAY" \
        --user="username" \
        electron_demo_x11-ci
