#!/bin/bash
set -euo pipefail
# Download the pinned, checksum-verified distribution before compiling the app.
# Retries are limited to bootstrap; compilation failures are not retried.
for attempt in 1 2 3; do
  if bash ./gradlew --no-daemon --version; then
    exit 0
  fi
  if [ "$attempt" -lt 3 ]; then
    echo "Gradle bootstrap failed; retrying ($attempt/3)." >&2
    sleep "$((attempt * 3))"
  fi
done
echo 'Gradle bootstrap failed after three attempts.' >&2
exit 1
