#!/bin/bash
# Script to generate client certificates for admin ingress testing

set -e

CERT_DIR="${1:-./client-certs}"
mkdir -p "$CERT_DIR"

echo "Creating certificate directory: $CERT_DIR"

# Generate CA key and certificate
if [ ! -f "$CERT_DIR/ca.key" ]; then
    echo "Generating CA private key..."
    openssl genrsa -out "$CERT_DIR/ca.key" 4096
fi

if [ ! -f "$CERT_DIR/ca.crt" ]; then
    echo "Generating CA certificate..."
    openssl req -new -x509 -days 3650 -key "$CERT_DIR/ca.key" -out "$CERT_DIR/ca.crt" \
        -subj "/C=US/ST=Dev/L=Local/O=OpenCupid/CN=OpenCupid Admin CA"
fi

# Generate client key and certificate
if [ ! -f "$CERT_DIR/client.key" ]; then
    echo "Generating client private key..."
    openssl genrsa -out "$CERT_DIR/client.key" 2048
fi

if [ ! -f "$CERT_DIR/client.csr" ]; then
    echo "Generating client certificate signing request..."
    openssl req -new -key "$CERT_DIR/client.key" -out "$CERT_DIR/client.csr" \
        -subj "/C=US/ST=Dev/L=Local/O=OpenCupid/CN=Admin User"
fi

if [ ! -f "$CERT_DIR/client.crt" ]; then
    echo "Signing client certificate..."
    openssl x509 -req -days 365 -in "$CERT_DIR/client.csr" \
        -CA "$CERT_DIR/ca.crt" -CAkey "$CERT_DIR/ca.key" \
        -set_serial 01 -out "$CERT_DIR/client.crt"
fi

# Generate PKCS12 bundle for browser import
if [ ! -f "$CERT_DIR/client.p12" ]; then
    echo "Creating PKCS12 bundle for browser import..."
    openssl pkcs12 -export -out "$CERT_DIR/client.p12" \
        -inkey "$CERT_DIR/client.key" \
        -in "$CERT_DIR/client.crt" \
        -certfile "$CERT_DIR/ca.crt" \
        -passout pass:changeme
fi

echo "
Certificate generation complete!

Files created in $CERT_DIR:
  - ca.key        (CA private key - keep secure!)
  - ca.crt        (CA certificate - use in nginx config)
  - client.key    (Client private key)
  - client.crt    (Client certificate)
  - client.p12    (PKCS12 bundle for browser import, password: changeme)

To test with curl:
  curl --cert $CERT_DIR/client.crt --key $CERT_DIR/client.key https://admin.example.org/

To import to browser:
  1. Import $CERT_DIR/client.p12
  2. Password: changeme
  3. Visit https://admin.example.org/ and select the certificate when prompted
"

chmod 600 "$CERT_DIR/ca.key" "$CERT_DIR/client.key"
chmod 644 "$CERT_DIR/ca.crt" "$CERT_DIR/client.crt"
