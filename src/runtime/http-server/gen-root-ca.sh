#!/bin/sh
set -e

cat > myCA.ext << EOF
basicConstraints     = CA:TRUE
EOF

openssl genrsa -out myCA.key 2048
openssl req -new -days 3650 -key myCA.key -out myCA.pem
openssl x509 -req -days 3650 -in myCA.pem -signkey myCA.key -extfile ./myCA.ext -out myCA.crt
openssl x509 -inform PEM -outform DER -in myCA.crt -out myCA.der.crt
