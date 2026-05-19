#!/usr/bin/env bash
set -euo pipefail

CONTRACT_FILE="${1:-contracts/team-iot.openapi.yaml}"
PORT="${2:-4010}"

echo "Starting Prism mock from ${CONTRACT_FILE} on port ${PORT}"
npx prism mock "${CONTRACT_FILE}" -p "${PORT}" --host 0.0.0.0
