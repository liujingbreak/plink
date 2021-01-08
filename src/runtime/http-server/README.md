HTTP server for Plink
=========


To Generate SSL certificate
```
openssl req -newkey rsa:2048 -nodes -keyout key.pem -x509 -days 365 -out cert.pem
```

Enable Chrome to accept this new certificate:
Open Chrome with:
`chrome://flags/#allow-insecure-localhost`
