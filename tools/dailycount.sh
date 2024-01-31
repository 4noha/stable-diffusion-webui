#!/bin/bash

PORT=4000
dir_path="/home/ec2-user/stable-diffusion-webui/outputs/txt2img-images/*"

function init() {
  echo "-----------------------------------------------------"
  echo -n "[INFO] Start at: "
  date "+%Y/%m/%d-%H:%M:%S"
  echo "-----------------------------------------------------"
  figlet "bash server"
  echo "-----------------------------------------------------"
  echo "The Server is running at http://127.0.0.1:${PORT}"
  echo "-----------------------------------------------------"
}

function response() {
  echo "HTTP/1.0 200 OK"
  echo "Content-Type: text/plain"
  echo ""
  dirs=`find $dir_path -maxdepth 0 -type d`
  for dir in $dirs;
  do
    echo \"$(basename ${dir})\", $(ls -U1 $dir/ | wc -l)
  done
}


##################################################
# main部分
##################################################

init

trap exit INT
while true; do
  response | nc -l "$PORT" -w 1 
done
