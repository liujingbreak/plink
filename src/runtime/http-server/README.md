HTTP server for Plink
=========
[Create Your Own SSL Certificate Authority for Local HTTPS Development](https://deliciousbrains.com/ssl-certificate-authority-for-local-https-development/#why-https-locally)

## Generating the Private Key and Root Certificate

1. generate the private key to become a local CA

Run `gen-root-ca.sh`

3. Install root CA certificate

- Adding the Root Certificate to macOS Monterey Keychain

```bash
sudo security add-trusted-cert -d -r trustRoot -k "/Library/Keychains/System.keychain" myCA.pem
```

Adding the Root Certificate to Linux

```bash
sudo apt-get install -y ca-certificates
```

#### Convert the myCA.pem certificate to a myCA.crt certificate file.

```bash
sudo cp myCA.crt /usr/local/share/ca-certificates

sudo update-ca-certificates

```
## Creating CA-Signed Certificates for Your Dev Sites

- Run `gen-ssl-ca.sh`
- Adding the Root Certificate to Linux

Enable Chrome to accept this new certificate:
Open Chrome with:
`chrome://flags/#allow-insecure-localhost`
