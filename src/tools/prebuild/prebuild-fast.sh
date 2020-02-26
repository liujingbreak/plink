set -e
# If version of dr-comp-package is changed in package.json, you probably need a prebuild-all.sh
env=$1
configName=$2
isStatic=$3
drcp="node node_modules/dr-comp-package/bin/drcp.js"

dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
bash "${dir}/_check-argv.sh" $*


export CHALK_ENABLED=false
# export PATH=$PATH:/c/Users/DELL/AppData/Roaming/npm
# npm set registry https://registry.npm.taobao.org

rm -r dist/static || :
git clean -f .
$drcp project add .
$drcp init

$drcp run scripts/prebuild/merge-artifacts.ts#prepare

echo "isStatic: $isStatic"
if [ $isStatic != "true" ]; then
  bash "${dir}/prebuild-server.sh" $*
fi

if [ $configName != "node-server" ]; then
  bash "${dir}/prebuild-webui.sh" $*
fi
