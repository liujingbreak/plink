set -e
env=$1
configName=$2
isStatic=$3

if [ -z $env ] || [ -z $configName ] || [ -z $isStatic ]; then
	echo "missing argument for <dev|prod|local|dell> <bcl|byj> <true|false>"
	echo "e.g. bash scripts/prebuild/prebuild.sh dev credit-appl true"
	exit 1
fi
