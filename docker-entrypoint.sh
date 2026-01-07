#!/bin/sh

# Generate env-config.js with runtime environment variables
cat <<EOF > /usr/share/nginx/html/env-config.js
window.__ENV__ = {
  GEMINI_API_KEY: "${GEMINI_API_KEY:-}",
  VITE_USER: "${VITE_USER:-}",
  VITE_PASS: "${VITE_PASS:-}"
};
EOF

echo "Environment config generated:"
cat /usr/share/nginx/html/env-config.js

# Start nginx
exec nginx -g "daemon off;"
