Quick Start
---------
### 如果你是平台开发者

1.	git clone 平台源码后，在根目录下执行

	```shell
	npm install
	gulp build
	npm start

	```

	The demo server is started. Now open browser for URL:[http://localhost:14333](http://localhost:14333)

	[http://localhost:14333/example-dr/route2](http://localhost:14333/example-dr/route2)

	If you are able to see a "normal" page, that means it worked.

	> You may also manage your profile level npmrc by `npm set registry http://localhost:4873/`
	>
	> Another cool way is to use `nrm` to switch your NPM registry endpoint.


2.	如果你需要一个本地Sinopia (private NPM registry)

	```shell
	npm install -g sinopia
	```
	Start it!

	```shell
	sinopia
	```
	访问 [http://localhost:4873/](http://localhost:4873/)

3.	Publish packages
	```shell
	npm set registry http://localhost:4873/
	npm adduser <your user name>
	# If you modified anything, bump version before publish
	gulp publish
	```
