FROM google/golang
WORKDIR /go/src/ecs-browser
COPY * /go/src/ecs-browser/
RUN go get "github.com/cloudfoundry-community/go-cfenv"
RUN go get "github.com/codegangsta/negroni"
RUN go get "github.com/gorilla/mux"
RUN go get "github.com/gorilla/sessions"
RUN go get "github.com/unrolled/render"
RUN go build .
CMD /go/src/ecs-browser/ecs-browser
