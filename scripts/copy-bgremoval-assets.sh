#!/bin/bash
# Run after npm install to refresh background-removal WASM assets
cp /home/sandip/photobooth-saas/app/node_modules/@imgly/background-removal/dist/* /home/sandip/photobooth-saas/app/public/bgremoval/
echo "Copied bgremoval assets"
