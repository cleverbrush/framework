#!/bin/bash

# Enable no-auth local mode so the OTLP endpoint accepts data without an API key.
# This is intentional for the demo stack — do NOT use in production.
export IS_LOCAL_APP_MODE="DANGEROUSLY_is_local_app_mode💀"

source "/etc/local/entry.base.sh"
