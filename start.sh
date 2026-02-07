#!/bin/bash

echo "Starting backend..."

cd sms_backend || exit 1

pip install -r requirements.txt

python main.py

