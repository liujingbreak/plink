set -e
env=$1
configName=$2
hashfile=dist/static/$configName.githash-webui.txt

dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
bash "${dir}/_check-argv.sh" $*

echo build webui for $configName

nodeCmd="node --max-old-space-size=24000 node_modules/@angular/cli/bin/ng"

drcpConfig="conf/$configName.ts,conf/$configName-dev.ts"
if [ $env = dev ] || [ $env = test ]; then
	ngConfig=dev
elif [ $env = stage ]; then
	ngConfig=stage
	drcpConfig="conf/$configName.ts"
elif [ $env = prod ]; then
	ngConfig=production
	drcpConfig="conf/$configName.ts"
else
	ngConfig="dev-proxy-optimize"
fi
${nodeCmd} build -c $ngConfig --drcp-config $drcpConfig
if [ $configName = "credit-appl" ]; then
	bash ${dir}/prebuild-prerender.sh $1 $2
fi

git log -1 > $hashfile
echo "Last build: $configName - $env" >> $hashfile
# bash ${dir}/repo-git-log.sh $env `pwd`/$hashfile
