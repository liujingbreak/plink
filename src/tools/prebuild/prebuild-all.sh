set -e
env=$1
configName=$2
isStatic=$3

dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
bash "${dir}/_check-argv.sh" $*

git clean -f .
rm -r dist ||:
rm yarn.lock || :
rm package-lock.json || :
rm -r node_modules/dr-comp-package node_modules/@dr-core node_modules/@dr || :
rm -r node_modules/@bk || :
rm dr.project.list.json || :

export CHALK_ENABLED=false
# export PATH=$PATH:/c/Users/DELL/AppData/Roaming/npm
# npm set registry https://registry.npm.taobao.org

rm -r dist || :
rm package-lock.json || :
rm yarn.lock || :
npm i
node node_modules/dr-comp-package/bin/drcp.js clean
node node_modules/dr-comp-package/bin/drcp.js project add .
node node_modules/dr-comp-package/bin/drcp.js init
# if [ $configName != 'console' ] && [ $configName != 'credit-appl' ]
# then
#   bash "${dir}/sync-repo.sh"
# fi

bash "${dir}/prebuild-server.sh" $*
bash "${dir}/prebuild-webui.sh" $*
