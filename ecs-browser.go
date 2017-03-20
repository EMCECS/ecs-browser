package main

import (
  "encoding/json"
  "encoding/xml"
  "io/ioutil"
  "log"
  "net/http"
  "net/url"
  "os"
  "strings"
  "strconv"
  "time"
  cfenv "github.com/cloudfoundry-community/go-cfenv"
  "github.com/codegangsta/negroni"
  "github.com/gorilla/mux"
  "github.com/gorilla/sessions"
  "github.com/unrolled/render"
)

var store = sessions.NewCookieStore([]byte("session-key"))
var rendering *render.Render
var config Config
var ecs Ecs
var router = mux.NewRouter()

type Ecs struct {
  User string
  Password string
  Endpoint string
}

type Response struct {
  Code int
  Body string
  RequestHeaders http.Header
  ResponseHeaders http.Header
}

type appError struct {
	err error
	status int
	json string
	template string
  xml string
	binding interface{}
}

type appHandler func(http.ResponseWriter, *http.Request) *appError

func (fn appHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
  if e := fn(w, r); e != nil {
		log.Print(e.err)
		if e.status != 0 {
			if e.json != "" {
				rendering.JSON(w, e.status, e.json)
			} else if e.xml != "" {
				rendering.XML(w, e.status, e.xml)
			} else {
				rendering.HTML(w, e.status, e.template, e.binding)
			}
		}
  }
}

func RecoverHandler(next http.Handler) http.Handler {
  fn := func(w http.ResponseWriter, r *http.Request) {
    defer func() {
      if err := recover(); err != nil {
        log.Printf("panic: %+v", err)
        http.Error(w, http.StatusText(500), 500)
      }
    }()
    next.ServeHTTP(w, r)
  }
	return http.HandlerFunc(fn)
}

func main() {
  // Read the config file
  configFile, err := ioutil.ReadFile("./config.json")
  if err != nil {
    log.Fatal("Can't open the configuration file: ", err)
  }
  /*
  configFile, err := Asset("config.json")
  if err != nil {
    log.Fatal("Can't open the configuration file: ", err)
  }
  */
  json.Unmarshal(configFile, &config)

  // To be compatible with Cloud Foundry
  var port = ""
  _, err = cfenv.Current()
  if(err != nil) {
    port = "80"
  } else {
    port = os.Getenv("PORT")
  }

  ecs = Ecs{
    User: os.Getenv("USER"),
    Password: os.Getenv("PASSWORD"),
    Endpoint: os.Getenv("ENDPOINT"),
  }

  // See http://godoc.org/github.com/unrolled/render
  rendering = render.New(render.Options{Directory: "app/templates"})
  // See http://www.gorillatoolkit.org/pkg/mux
  router.HandleFunc("/", Index)
  apiHandle("credentials", appHandler(Credentials), "GET")
  apiHandle("ecs/info", appHandler(GetEcsInfo), "GET")
  apiHandle("buckets", appHandler(ListBuckets), "GET")
  apiHandle("examples", appHandler(GetExamples), "GET")
  apiHandle("s3/{bucket}/", appHandler(S3ObjectGet), "GET")
  apiHandle("bucket", appHandler(CreateBucket), "POST")
  apiHandle("metadatasearch", appHandler(MetadataSearch), "POST")
  apiHandle("searchmetadata", appHandler(SearchMetadata), "POST")
  apiHandle("apis", appHandler(Apis), "POST")
  apiHandle("billing/namespaces", appHandler(BillingGetNamespaces), "GET")
  apiHandle("billing/users/{namespace}", appHandler(BillingGetUsers), "GET")
  apiHandle("billing/buckets/{namespace}", appHandler(BillingGetBuckets), "GET")
  apiHandle("billing/info/{namespace}", appHandler(BillingGetCurrentUsage), "POST")
  router.HandleFunc("/login", Login)
  router.HandleFunc("/logout", Logout)
  router.PathPrefix("/app/").Handler(http.StripPrefix("/app/", http.FileServer(http.Dir("app"))))
	n := negroni.Classic()
	n.UseHandler(RecoverHandler(LoginMiddleware(router)))
	n.Run(":" + port)
	log.Printf("Listening on port " + port)
}

var apiBase = "/api/v1/"

func apiHandle(path string, handler http.Handler, methodName string) {
    log.Printf(path)
	router.Handle(apiBase + path, handler).Methods(methodName)
}

// Main page
func Index(w http.ResponseWriter, r *http.Request) {
  session, err := store.Get(r, "session-name")
  if err != nil {
    rendering.HTML(w, http.StatusInternalServerError, "error", http.StatusInternalServerError)
  }
  s3Login := false
  if _, ok := session.Values["AccessKey"]; ok {
    s3Login = true
  }
  rendering.HTML(w, http.StatusOK, "index",  map[string]interface{}{
    "s3login": s3Login,
  })
}

// Retrieve the examples loaded from the config.json file
func GetExamples(w http.ResponseWriter, r *http.Request) *appError {
  rendering.JSON(w, http.StatusOK, config.Examples)

  return nil
}

// Get the credentials for the object user
func Credentials(w http.ResponseWriter, r *http.Request) *appError {
  session, err := store.Get(r, "session-name")
  if err != nil {
    return &appError{err: err, status: http.StatusInternalServerError, json: http.StatusText(http.StatusInternalServerError)}
  }
  rendering.JSON(w, http.StatusOK, struct {
    AccessKey string `json:"access-key"`
    SecretKey string `json:"secret-key"`
    Endpoint string `json:"endpoint"`
    Html5browser string `json:"html5browser"`
  } {
    AccessKey: session.Values["AccessKey"].(string),
    SecretKey: session.Values["SecretKey"].(string),
    Endpoint: session.Values["Endpoint"].(string),
    Html5browser: os.Getenv("HTML5BROWSER"),
  })

  return nil
}

type EcsInfo struct {
  DefaultReplicationGroup string `json:"default-replication-group"`
  UserAllowedReplicationGroups []string `json:"user-allowed-replication-groups"`
  AtmosSubtenants []string `json:"atmos-subtenants"`
  SwiftContainers []string `json:"swift-containers"`
}

// Get the replication groups allowed for the object user
func GetEcsInfo(w http.ResponseWriter, r *http.Request) *appError {
  if ecs.Endpoint == "" || ecs.User == "" || ecs.Password == "" {
    return nil
  }
  s3, err := GetS3(r)
  if err != nil {
    return &appError{err: err, status: http.StatusInternalServerError, json: http.StatusText(http.StatusInternalServerError)}
  }
  // Get the namespace of the object user
  headersUser := make(map[string][]string)
  responseUser, err := ecsRequest(ecs.Endpoint, ecs.User, ecs.Password, "GET", "/object/users/" + s3.AccessKey + "/info.json", headersUser, "")
  if err != nil {
    return &appError{err: err, status: http.StatusInternalServerError, json: http.StatusText(http.StatusInternalServerError)}
  }
  var  user map[string]interface{}
  err = json.Unmarshal([]byte(responseUser.Body), &user)
  if err != nil {
    return &appError{err: err, status: http.StatusBadRequest, json: "Can't decode JSON data"}
  }
  // Get the default replication group and the ones allowed/disabllowed for this namespace
  headersNamespace := make(map[string][]string)
  responseNamespace, err := ecsRequest(ecs.Endpoint, ecs.User, ecs.Password, "GET", "/object/namespaces/namespace/" + user["namespace"].(string) + ".json", headersNamespace, "")
  if err != nil {
    return &appError{err: err, status: http.StatusInternalServerError, json: http.StatusText(http.StatusInternalServerError)}
  }
  var  namespace map[string]interface{}
  err = json.Unmarshal([]byte(responseNamespace.Body), &namespace)
  if err != nil {
    return &appError{err: err, status: http.StatusBadRequest, json: "Can't decode JSON data"}
  }
  defaultReplicationGroupId := namespace["default_data_services_vpool"].(string)
  var allowedReplicationGroups []string
  if len(namespace["allowed_vpools_list"].([]interface{})) > 0 {
    allowedReplicationGroups = namespace["allowed_vpools_list"].([]string)
  }
  var disallowedReplicationGroups []string
  if len(namespace["allowed_vpools_list"].([]interface{})) > 0 {
    disallowedReplicationGroups = namespace["disallowed_vpools_list"].([]string)
  }
  // Get all the buckets
  headersBuckets := make(map[string][]string)
  responseBuckets, err := ecsRequest(ecs.Endpoint, ecs.User, ecs.Password, "GET", "/object/bucket.json?namespace=" + user["namespace"].(string), headersBuckets, "")
  if err != nil {
    return &appError{err: err, status: http.StatusInternalServerError, json: http.StatusText(http.StatusInternalServerError)}
  }
  var buckets map[string]interface{}
  err = json.Unmarshal([]byte(responseBuckets.Body), &buckets)
  if err != nil {
    return &appError{err: err, status: http.StatusBadRequest, json: "Can't decode JSON data"}
  }
  var atmosSubtenants []string
  var swiftContainers []string
  for _, bucket := range buckets["object_bucket"].([]interface{}) {
    name := bucket.(map[string]interface{})["name"].(string)
    owner := bucket.(map[string]interface{})["owner"].(string)
    apiType := bucket.(map[string]interface{})["api_type"].(string)
    if owner == s3.AccessKey {
      if apiType == "ATMOS" {
        atmosSubtenants = append(atmosSubtenants, name)
      }
      if apiType == "SWIFT" {
        swiftContainers = append(swiftContainers, name)
      }
    }
  }
  // Get all the replication groups
  headersReplicationGroups := make(map[string][]string)
  responseReplicationGroups, err := ecsRequest(ecs.Endpoint, ecs.User, ecs.Password, "GET", "/vdc/data-service/vpools.json", headersReplicationGroups, "")
  if err != nil {
    return &appError{err: err, status: http.StatusInternalServerError, json: http.StatusText(http.StatusInternalServerError)}
  }
  var  replicationGroups map[string]interface{}
  err = json.Unmarshal([]byte(responseReplicationGroups.Body), &replicationGroups)
  if err != nil {
    return &appError{err: err, status: http.StatusBadRequest, json: "Can't decode JSON data"}
  }
  defaultReplicationGroupName := ""
  var userAllowedReplicationGroups []string
  for _, replicationGroup := range replicationGroups["data_service_vpool"].([]interface{}) {
    name := replicationGroup.(map[string]interface{})["name"].(string)
    id := replicationGroup.(map[string]interface{})["id"].(string)
    if id == defaultReplicationGroupId {
      defaultReplicationGroupName = name
    }
    if len(allowedReplicationGroups) == 0 && len(disallowedReplicationGroups) == 0 {
      userAllowedReplicationGroups = append(userAllowedReplicationGroups, name)
    } else if contains(allowedReplicationGroups, id) && !contains(disallowedReplicationGroups, id) {
      userAllowedReplicationGroups = append(userAllowedReplicationGroups, name)
    }
  }

  ecsInfo := EcsInfo {
    DefaultReplicationGroup: defaultReplicationGroupName,
    UserAllowedReplicationGroups: userAllowedReplicationGroups,
    AtmosSubtenants: atmosSubtenants,
    SwiftContainers: swiftContainers,
  }

  rendering.JSON(w, http.StatusOK, ecsInfo)

  return nil
}

type Query struct {
  Bucket string `json:"search_bucket"`
  Query string `json:"search_query"`
  MaxKeys string `json:"search_max_keys"`
  SortedBy string `json:"search_sorted_by"`
  ReturnAllMetadata bool `json:"search_return_all_metadata"`
  Marker string `json:"search_marker"`
}

// Execute the metadata search
func MetadataSearch(w http.ResponseWriter, r *http.Request) *appError {
  s3, err := GetS3(r)
  if err != nil {
    return &appError{err: err, status: http.StatusInternalServerError, json: http.StatusText(http.StatusInternalServerError)}
  }
  decoder := json.NewDecoder(r.Body)
  var query Query
  err = decoder.Decode(&query)
  if err != nil {
    return &appError{err: err, status: http.StatusBadRequest, json: "Can't decode JSON data"}
  }
  path := "/?query=" + strings.Replace(query.Query, "%20", " ", -1)
  if query.Marker != "" {
    path += "&marker=" + query.Marker
  }
  if query.MaxKeys != "" {
    path += "&max-keys=" + query.MaxKeys
  }
  if query.SortedBy != "" {
    path += "&sorted=" + query.SortedBy
  }
  if query.ReturnAllMetadata {
    path += "&attributes=ALL"
  }
  bucketQueryResponse, err := s3Request(s3, query.Bucket, "GET", path, make(map[string][]string), "")
  if err != nil {
    return &appError{err: err, status: http.StatusInternalServerError, json: http.StatusText(http.StatusInternalServerError)}
  }
  if bucketQueryResponse.Code == 200 {
    bucketQueryResult := &BucketQueryResult{}
    xml.NewDecoder(strings.NewReader(bucketQueryResponse.Body)).Decode(bucketQueryResult)
    // Generate a shared URL for each object returned by the metadata search
    if len(bucketQueryResult.EntryLists) > 0 {
      expires := time.Now().Add(time.Second*24*3600)
      for i, item := range bucketQueryResult.EntryLists {
        if item.ObjectName[len(item.ObjectName)-1:] != "/" {
          headers := make(map[string][]string)
          preparedS3Request, _ := prepareS3Request(s3, query.Bucket, "GET", query.Bucket + "/" + item.ObjectName + "?Expires=" + strconv.FormatInt(expires.Unix(), 10), headers, true)
          values := url.Values{}
          values = preparedS3Request.Params
          bucketQueryResult.EntryLists[i].Url = strings.Split(preparedS3Request.Url, "?")[0] + "?" + values.Encode()
        }
      }
    }
    rendering.JSON(w, http.StatusOK, bucketQueryResult)
  } else {
    return &appError{err: err, status: http.StatusInternalServerError, xml: bucketQueryResponse.Body}
  }

  return nil
}

// Retrieve information about metadata indexed for a bucket
func SearchMetadata(w http.ResponseWriter, r *http.Request) *appError {
  s3, err := GetS3(r)
  if err != nil {
    return &appError{err: err, status: http.StatusInternalServerError, json: http.StatusText(http.StatusInternalServerError)}
  }
  decoder := json.NewDecoder(r.Body)
  var s map[string]string
  err = decoder.Decode(&s)
  if err != nil {
    return &appError{err: err, status: http.StatusBadRequest, json: "Can't decode JSON data"}
  }
  bucket := s["search_bucket"]
  bucketSearchMetadataResponse, err := s3Request(s3, bucket, "GET", "/?searchmetadata", make(map[string][]string), "")
  if err != nil {
    return &appError{err: err, status: http.StatusInternalServerError, json: http.StatusText(http.StatusInternalServerError)}
  }
  bucketSearchMetadataResult := &BucketSearchMetadataResult{}
  xml.NewDecoder(strings.NewReader(bucketSearchMetadataResponse.Body)).Decode(bucketSearchMetadataResult)
  rendering.JSON(w, http.StatusOK, bucketSearchMetadataResult)

  return nil
}

type ApisQuery struct {
  Api string `json:"apis_api"`
  Endpoint string `json:"apis_endpoint"`
  Password string `json:"apis_password"`
  Bucket string `json:"apis_bucket"`
  Container string `json:"apis_container"`
  Subtenant string `json:"apis_subtenant"`
  Path string `json:"apis_path"`
  Range string `json:"apis_range"`
  Data string `json:"apis_data"`
  Method string `json:"apis_method"`
  Headers map[string][]string `json:"apis_headers"`
}

type HttpResponse struct {
  Method string `json:"method"`
  Path string `json:"path"`
  Code int `json:"code"`
  RequestHeaders map[string][]string `json:"request_headers"`
  ResponseHeaders map[string][]string `json:"response_headers"`
  Body string `json:"body"`
}

// Execute the API request
func Apis(w http.ResponseWriter, r *http.Request) *appError {
  decoder := json.NewDecoder(r.Body)
  var apisQuery ApisQuery
  err := decoder.Decode(&apisQuery)
  if err != nil {
    return &appError{err: err, status: http.StatusBadRequest, json: "Can't decode JSON data"}
  }
  headers := make(map[string][]string)
  if len(apisQuery.Headers) > 0 {
    headers = apisQuery.Headers
  }
  if apisQuery.Range != "" {
    headers["Range"] = []string{apisQuery.Range}
  }
  var response Response
  if apisQuery.Api == "s3" {
    s3, err := GetS3(r)
    if err != nil {
      return &appError{err: err, status: http.StatusInternalServerError, json: http.StatusText(http.StatusInternalServerError)}
    }
    response, err = s3Request(s3, apisQuery.Bucket, apisQuery.Method, apisQuery.Path, headers, apisQuery.Data)
    if err != nil {
      return &appError{err: err, status: http.StatusInternalServerError, json: err.Error()}
    }
  } else if apisQuery.Api == "swift" {
    s3, err := GetS3(r)
    if err != nil {
      return &appError{err: err, status: http.StatusInternalServerError, json: http.StatusText(http.StatusInternalServerError)}
    }
    response, err = swiftRequest(apisQuery.Endpoint, s3.AccessKey, apisQuery.Password, apisQuery.Container, apisQuery.Method, apisQuery.Path, headers, apisQuery.Data)
    if err != nil {
      return &appError{err: err, status: http.StatusInternalServerError, json: err.Error()}
    }
  } else if apisQuery.Api == "atmos" {
    s3, err := GetS3(r)
    if err != nil {
      return &appError{err: err, status: http.StatusInternalServerError, json: http.StatusText(http.StatusInternalServerError)}
    }
    response, err = atmosRequest(apisQuery.Endpoint, s3.AccessKey, s3.SecretKey, apisQuery.Subtenant, apisQuery.Method, apisQuery.Path, headers, apisQuery.Data)
    if err != nil {
      return &appError{err: err, status: http.StatusInternalServerError, json: err.Error()}
    }
  } else if apisQuery.Api == "ecs" {
    session, err := store.Get(r, "session-name")
    if err != nil {
      return &appError{err: err, status: http.StatusInternalServerError, json: http.StatusText(http.StatusInternalServerError)}
    }
    response, err = ecsRequest(session.Values["Endpoint"].(string), session.Values["User"].(string), session.Values["Password"].(string), apisQuery.Method, apisQuery.Path, headers, apisQuery.Data)
    if err != nil {
      return &appError{err: err, status: http.StatusInternalServerError, json: err.Error()}
    }
  }
  var httpResponse HttpResponse
  httpResponse.Method = apisQuery.Method
  httpResponse.Path = apisQuery.Path
  httpResponse.Code = response.Code
  httpResponse.RequestHeaders = response.RequestHeaders
  httpResponse.ResponseHeaders = response.ResponseHeaders
  httpResponse.Body = response.Body
  rendering.JSON(w, http.StatusOK, httpResponse)

  return nil
}
