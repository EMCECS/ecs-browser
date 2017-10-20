export GOPATH=/Users/denisjannot/Syncplicity/Documents/Dev/go
export PATH=$PATH:$GOPATH/bin
go-bindata config.json
GO15VENDOREXPERIMENT=1 godep save .
unik build --name ecsproxyImage --path ./ --compiler rump-go-virtualbox --provider virtualbox
