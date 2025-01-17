[[ -d layers/nodejs ]] || rm -rf layers/nodejs
mkdir -p layers/nodejs
cp -r node_modules layers/nodejs

echo "Before pruning"
du -sh layers/nodejs/

curl -sf https://gobinaries.com/github.com/tj/node-prune@v1.2.0 | PREFIX=. sh
node-prune ./layers/nodejs

echo "After pruning"
du -sh ./layers/nodejs
rm node-prune