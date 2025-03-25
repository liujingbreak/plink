#!/bin/bash

# Enable mouse event reporting
echo -e "\e[?1005h"
echo -e "\e[?1003h" # Enable all mouse events (including drag)

# Function to disable mouse event reporting and exit
cleanup() {
    echo -e "\e[?1005l"
    echo -e "\e[?1003l"
    stty sane
    exit
}

# Trap Ctrl+C (SIGINT) and call cleanup
trap cleanup SIGINT

# Set terminal to raw mode to read individual characters
stty -echo -icanon -icrnl time 0 min 1

echo "Mouse event reporting enabled. Move or click the mouse to see events. Press 'q' to quit."

while true; do
    # Read one character at a time
    IFS= read -r -n 1 char

    # Check for 'q' to quit
    if [[ "$char" == "q" ]]; then
        cleanup
    fi

    # Check for mouse event sequence
    if [[ "$char" == $'\e' ]]; then
        read -r -n 2 -t 0.1 char
        if [[ "$char" == "[M" ]]; then
            read -r -n 3 -t 0.1 mouse_data
            if [[ ${#mouse_data} -eq 3 ]]; then
                button_code=$(printf "%d" "'${mouse_data:0:1}")
                x=$(printf "%d" "'${mouse_data:1:1}")
                y=$(printf "%d" "'${mouse_data:2:1}")
                x=$((x - 32))
                y=$((y - 32))
                echo "Mouse event: button=$((button_code - 32)), x=$x, y=$y"
            fi
        fi
    fi
done
