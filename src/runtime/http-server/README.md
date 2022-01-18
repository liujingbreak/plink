HTTP server for Plink
=========
[Create Your Own SSL Certificate Authority for Local HTTPS Development](https://deliciousbrains.com/ssl-certificate-authority-for-local-https-development/#why-https-locally)

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
