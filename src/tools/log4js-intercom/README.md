# To fix pm2-intercom in PM2 2.x

Refer to log4js API doc https://log4js-node.github.io/log4js-node/api.html, regarding `pm2: true`

### Problems of pm2-intercom and log4js:

- Duplicate log messages
	PM2 v2.10.4 somehow runs multiple instances of pm2-intercom for cluster mode.
	> While you start with `pm2 install pm2-intercom` then start your application in cluster mode, it runs multiple instances which leads to duplicate log messages.

	I am guessing it is PM2 module system's fault, so I write this simple version which is not supposed to be run as `pm2 install` module anymore.

- Not supporting multiple applications in single PM2 box
	If you have 2 applications with difference names, and both in cluster mode, all of your log will go to first cluster instance/process of your first application's log appender.

## 1. Start lj-log4js-pm2intercom
Run this package as a normal PM2 application at first place,
> It must be the first application to be started in PM2 (fork mode)

```bash
npm i lj-log4js-pm2intercom
pm2 start node_modules/.bin/log4js-pm2 --name log4js-intercom
```
Or you can:
Clone this repo, go to root directory and run command:
```bash
yarn install # or npm install
pm2 start encosystem.conf.js
```

## 2. Change your application source code
In your application source where you configure log4js, add following code:

```js
const pm2InstanceId = process.env.NODE_APP_INSTANCE;
// Only log4js master process need to handle all log appenders
if (pm2InstanceId === '0') {
	// Tell lj-log4js-pm2intercom: I am the log4js master process
	// lj-log4js-pm2intercom will need to know my process id and application name
	process.send({topic: 'log4js:master'});
}
```
then you start your applications in pm2 cluster mode as normal:

```bash
pm2 start app.js -i 2 --name <your application name>
```
> Be aware to always use `--name` to specify a name


Now run `pm2 ls`, you should see something like below
```
┌───────────────────┬────┬─────────┬───────┬────────┬─────────┬────────┬─────┬───────────┬─────────┬──────────┐
│ App name          │ id │ mode    │ pid   │ status │ restart │ uptime │ cpu │ mem       │ user    │ watching │
├───────────────────┼────┼─────────┼───────┼────────┼─────────┼────────┼─────┼───────────┼─────────┼──────────┤
│ credit-appl-local │ 1  │ cluster │ 67022 │ online │ 0       │ 10m    │ 0%  │ 59.4 MB   │ liujing │ disabled │
│ credit-appl-local │ 2  │ cluster │ 67023 │ online │ 0       │ 10m    │ 0%  │ 62.2 MB   │ liujing │ disabled │
│ log4js-intercom   │ 0  │ fork    │ 67011 │ online │ 0       │ 10m    │ 0%  │ 29.6 MB   │ liujing │ disabled │
└───────────────────┴────┴─────────┴───────┴────────┴─────────┴────────┴─────┴───────────┴─────────┴──────────┘
```
