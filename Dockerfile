FROM google/golang
COPY config.json /go/src/ecs-browser/
COPY *.go /go/src/ecs-browser/
COPY app/ /go/src/ecs-browser/app/
COPY vendor/ /go/src/
WORKDIR /go/src/ecs-browser
RUN go build .
CMD /go/src/ecs-browser/ecs-browser
