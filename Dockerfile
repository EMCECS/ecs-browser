FROM google/golang
WORKDIR /go/src/ecs-browser
COPY Dockerfile /go/src/ecs-browser/
COPY config.json /go/src/ecs-browser/
COPY README.md /go/src/ecs-browser/
COPY wercker.yml /go/src/ecs-browser/
COPY *.go /go/src/ecs-browser/
COPY app/ /go/src/ecs-browser/app/
COPY Godeps/ /go/src/ecs-browser/Godeps/
COPY vendor/ /go/src/ecs-browser/vendor/
RUN go get "github.com/cloudfoundry-community/go-cfenv"
RUN go get "github.com/codegangsta/negroni"
RUN go get "github.com/gorilla/mux"
RUN go get "github.com/gorilla/sessions"
RUN go get "github.com/unrolled/render"
RUN go build .
CMD /go/src/ecs-browser/ecs-browser
