# obsolete
set -e

dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
rootDir=$(dirname $(dirname ${dir}))
cd $rootDir

if [ -d ../credit-risk-frontend ]; then
  # cd ../credit-console-frontend
  # git checkout master
  # git pull origin master
  cd ../credit-risk-frontend
  git fetch origin
  git checkout -f master
  git merge origin/master
else
  echo '----------- WARNING -------------'
  echo 'Directory ../credit-risk-frontend does not exist!!!'
fi
if [ -d ../credit-console-frontend ]; then
  cd ../credit-console-frontend
  git fetch origin
  git checkout -f master
  git merge origin/master
  cd $rootDir
  node node_modules/dr-comp-package/bin/drcp.js project add .
  node node_modules/dr-comp-package/bin/drcp.js project add ../credit-console-frontend ../credit-risk-frontend
  node node_modules/dr-comp-package/bin/drcp.js init
else
  echo '----------- WARNING -------------'
  echo 'Directory ../credit-console-frontend does not exist!!!'
fi
