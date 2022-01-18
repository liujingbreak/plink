HTTP server for Plink
=========
[Create Your Own SSL Certificate Authority for Local HTTPS Development](https://deliciousbrains.com/ssl-certificate-authority-for-local-https-development/#why-https-locally)

## Generating the Private Key and Root Certificate

1. generate the private key to become a local CA
```bash
openssl genrsa -des3 -out myCA.key 2048
```
  On Windows with git bash: `winpty openssl genrsa -des3 -out myCA.key 2048`

2. generate a root certificate
```bash
openssl req -x509 -new -nodes -key myCA.key -sha256 -days 1825 -out myCA.pem
```
3. Install root CA certificate

- Adding the Root Certificate to macOS Monterey Keychain

```bash
sudo security add-trusted-cert -d -r trustRoot -k "/Library/Keychains/System.keychain" myCA.pem
```

Adding the Root Certificate to Linux

```bash
sudo apt-get install -y ca-certificates

# Convert the myCA.pem certificate to a myCA.crt certificate file.
openssl x509 -outform der -in ~/certs/myCA.pem -out ~/certs/myCA.crt

sudo cp ~/certs/myCA.crt /usr/local/share/ca-certificates

sudo update-ca-certificates

```
## Creating CA-Signed Certificates for Your Dev Sites

- Run `gen-ssl-ca.sh`
- Adding the Root Certificate to Linux
```bash
apt-get install -y ca-certificates
## Convert the myCA.pem certificate to a myCA.crt certificate file.
openssl x509 -outform der -in ~/certs/myCA.pem -out ~/certs/myCA.crt

```

To Generate SSL certificate
```
openssl req -newkey rsa:2048 -nodes -keyout key.pem -x509 -days 365 -out cert.pem
```

Enable Chrome to accept this new certificate:
Open Chrome with:
`chrome://flags/#allow-insecure-localhost`
