set -e
env=$1
configName=$2

if [ -z $env ] || [ -z $configName ]; then
	echo "missing argument for <environment> <config name>"
	echo "e.g. bash scripts/prebuild/prebuild.sh dev credit-appl"
	exit 1
fi

if [ $configName = "credit-console" ]; then
	node_modules/.bin/ng run credit-appl:server:production --drcp-config ../credit-console/conf/home.ts,../credit-console/conf/doc-viewer.ts,conf/$configName.prerender.ts
	node node_modules/dr-comp-package/bin/drcp.js run dist/prerender#render @bk/credit-appl -c dist/config.local.yaml conf/$configName.prerender.ts
else
	node_modules/.bin/ng run credit-appl:server:production --drcp-config conf/$configName.ts,conf/$configName.prerender.ts
	node node_modules/dr-comp-package/bin/drcp.js run dist/prerender#render @bk/credit-appl -c dist/config.local.yaml
fi
