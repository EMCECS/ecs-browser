package main

import (
  "crypto/tls"
  "net/http"
  "bytes"
)

func ecsRequest(endpoint string, user string, password string, method string, path string, headers map[string][]string, body string) (Response, error) {
  tr := &http.Transport{
    TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
  }
  httpClient := &http.Client{Transport: tr}
  reqLogin, err := http.NewRequest("GET", endpoint + "/login", nil)
  if err != nil {
    return Response{}, err
  }
  headersLogin := make(map[string][]string)
  reqLogin.Header = headersLogin
  reqLogin.SetBasicAuth(user, password)
  respLogin, err := httpClient.Do(reqLogin)
  if err != nil {
    return Response{}, err
  }
  headers["X-Sds-Auth-Token"] = respLogin.Header["X-Sds-Auth-Token"]
  req, err := http.NewRequest(method, endpoint + path, bytes.NewBufferString(body))
  if err != nil {
    return Response{}, err
  }
  req.Header = headers
  resp, err := httpClient.Do(req)
  if err != nil {
    return Response{}, err
  }
  buf := new(bytes.Buffer)
  buf.ReadFrom(resp.Body)
  data := buf.String()
  response := Response{
    Code: resp.StatusCode,
    Body: data,
    RequestHeaders: req.Header,
    ResponseHeaders: resp.Header,
  }

  return response, nil
}
