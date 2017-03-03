package main

import (
  "crypto/tls"
  "errors"
  "net/http"
  "bytes"
)

func swiftRequest(endpoint string, user string, password string, container string, method string, path string, headers map[string][]string, body string) (Response, error) {
  tr := &http.Transport{
    TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
  }
  httpClient := &http.Client{Transport: tr}
  reqLogin, err := http.NewRequest("GET", endpoint + "/auth/v1.0", nil)
  if err != nil {
    return Response{}, err
  }
  headersLogin := make(map[string][]string)
  headersLogin["X-Auth-User"] = []string{user}
  headersLogin["X-Auth-Key"] = []string{password}
  reqLogin.Header = headersLogin
  respLogin, err := httpClient.Do(reqLogin)
  if err != nil {
    return Response{}, err
  }
  if respLogin.StatusCode == 401 {
    return Response{}, errors.New("Unauthorized")
  }
  headers["X-Auth-Token"] = respLogin.Header["X-Auth-Token"]
  storageUrl := ""
  if container == "" {
    storageUrl = respLogin.Header["X-Storage-Url"][0] + path
  } else {
    storageUrl = respLogin.Header["X-Storage-Url"][0] + "/" + container + path
  }
  req, err := http.NewRequest(method, storageUrl, bytes.NewBufferString(body))
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
