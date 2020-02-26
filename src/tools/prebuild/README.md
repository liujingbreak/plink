> Have trouble with wring bash shell ? quick read https://ryanstutorials.net/bash-scripting-tutorial/bash-if-statements.php

## Design

### Features
1. **Support monorepo**, a repo contains multiple projects with different release schedule.
2. For **DevOps or admin developer**
3. Build out static resource (client side JS, CSS files) as zip for deploy
   - Also Store static resource together with Node server
4. Build out Node server for image deployment service(e.g. for K8s)
5. Build/deploy accepts 2 configuration parameters: **environment**, **project name**
6. Can dynamically push static resource to Node.js file server
7. Repo may provide customized static resource build scripts

## Prebuild scripts
1. Clean and build static resource and compile server side scripts,
then deploy to the remote file server (maybe CDN) and push to 
git branch `master`, `deploy-test` or `release`
```bash
bash scripts/prebuild/prebuild.sh <environment> <product-config-name> <true|false>
```
> <true|false> meaning whether the build only contains static resource and whether Node.js deployment is not required

2. Only clean and build static resource and compile server side scripts, do not deploy to remote file server,
do not push to any remote git branch
```bash
bash scripts/prebuild/prebuild-all.sh <environment> <product-config-name> <true|false>
```

3. Deploying existing static resource which was built previously by `prebuild-all.sh` or a failed `prebuild.sh`
   to remote file server and push to the remote git branch.
```bash
bash scripts/prebuild/prebuild-post.sh <environment> <product-config-name> <true|false>
```

4. Only deploying directory or zip file to the remote file server
```bash
bash scripts/prebuild/remote-deploy.sh <environment> <product-config-name> <zip-file or directory>
```

