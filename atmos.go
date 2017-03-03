package main

import (
  "bytes"
  "crypto/hmac"
  "crypto/sha1"
  "crypto/tls"
  "net/http"
  "sort"
  "strings"
  "time"
)

func atmosRequest(endpoint string, user string, password string, subtenant string, method string, path string, headers map[string][]string, body string) (Response, error) {
  headersToSend := headers
  if subtenant == "" {
    headersToSend["x-emc-uid"] = []string{user}
  } else {
    headersToSend["x-emc-uid"] = []string{subtenant + "/" + user}
  }
  headersToSend["x-emc-date"] = []string{time.Now().UTC().Format(time.RFC1123)}
  if _, ok := headersToSend["x-emc-meta"]; ok {
    headersToSend["x-emc-utf8"] = []string{"true"}
  }
  if _, ok := headersToSend["x-emc-listable-meta"]; ok {
    headersToSend["x-emc-utf8"] = []string{"true"}
  }
  var ctype, xemc string
  var sarray []string
  for k, v := range headersToSend {
    k = strings.ToLower(k)
    switch k {
      case "content-type":
        ctype = v[0]
      default:
        headersToSend[k] = v
        if strings.HasPrefix(k, "x-emc-") {
          vall := strings.Join(v, ",")
          sarray = append(sarray, k+":"+vall)
        }
    }
  }
  if len(sarray) > 0 {
    sort.StringSlice(sarray).Sort()
    xemc = strings.Join(sarray, "\n")
  }
  rangeHeader := ""
  if _, ok := headersToSend["range"]; ok {
    rangeHeader = headersToSend["range"][0]
  }
  canonicalizedResource := strings.ToLower(strings.Split(path, "=")[0])
  payload := method + "\n" + ctype + "\n" + rangeHeader + "\n" + "\n" + canonicalizedResource + "\n" + xemc
  password64, err := b64.DecodeString(password)
  if err != nil {
    return Response{}, err
  }
  hash := hmac.New(sha1.New, password64)
  hash.Write([]byte(payload))
  signature := make([]byte, b64.EncodedLen(hash.Size()))
  b64.Encode(signature, hash.Sum(nil))
  headersToSend["x-emc-signature"] = []string{string(signature)}
  tr := &http.Transport{
    TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
  }
  httpClient := &http.Client{Transport: tr}
  req, err := http.NewRequest(method, endpoint + path, bytes.NewBufferString(body))
  if err != nil {
    return Response{}, err
  }
  req.Header = headersToSend
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
