curl -o /dev/null http://172.17.0.2:14333/npm/versions/%40material-icons%2Ffont
rm -r out* || :
curl -v -o out http://172.17.0.2:14333/npm/_tarballs/%40material-icons%2Ffont/1.0.21

tar -tf out || :
echo "---------------------------"
curl -v -o out.tgz http://172.17.0.2:14333/npm/_tarballs/%40material-icons%2Ffont/1.0.21
tar -tf out.tgz

