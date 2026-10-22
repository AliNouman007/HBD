#!/usr/bin/env bash
set -euo pipefail
# Public-domain performance by Celestianpower. See public/audio/credits.json.
mkdir -p /tmp/birthday-world-audio
curl -fL 'https://upload.wikimedia.org/wikipedia/commons/e/ec/Happy_Birthday_Gerard.ogg' -o /tmp/birthday-world-audio/original.ogg
ffmpeg -y -i /tmp/birthday-world-audio/original.ogg -t 8.8 -af 'highpass=f=90,lowpass=f=11000,loudnorm=I=-22:TP=-3:LRA=7,afade=t=in:d=0.15,afade=t=out:st=7.3:d=1.5' -ar 44100 -ac 2 -codec:a libmp3lame -b:a 160k public/audio/happy-birthday.mp3
