set -e
env=$1
configName=$2

node node_modules/dr-comp-package/bin/drcp.js tsc --pj .
git log -1 > githash-server.txt
echo "Build: $env - $configName" >> githash-server.txt
# bash scripts/prebuild/repo-git-log.sh $env `pwd`/githash-server.txt
