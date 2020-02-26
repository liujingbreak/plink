# obsolete
set -e
env=$1
githashfile=$2
pwd=`pwd`

if [ -z $env ] || [ -z $githashfile ]; then
	echo "missing argument for <dev|prod|local|dell> <githash file>"
	exit 1
fi

if [ -d ../credit-risk-frontend -a -d ../credit-console-frontend ]; then
  cd ../credit-risk-frontend
  echo '-------- Repo: credit-risk-frontend -------' >> $githashfile
  git log -1 >> $githashfile

  cd ../credit-console-frontend
  echo '-------- Repo: credit-console-frontend -------' >> $githashfile
  git log -1 >> $githashfile
  echo 'git hash file dones'
  cd $pwd
else
  echo 'credit-console-frontend 和 credit-risk-frontend 两个文件夹必须都存在'
  exit
fi
