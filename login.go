package main

import (
  "bytes"
  "crypto/tls"
  "encoding/xml"
  "log"
  "net/http"
  "net/url"
  "strings"
  "github.com/gorilla/sessions"
)

func LoginMiddleware(h http.Handler) http.Handler {
  return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
    if r.URL.Path == "/login" || strings.HasPrefix(r.URL.Path, "/app") || (len(r.Header["X-Passthrough-Secret"]) > 0) {
      h.ServeHTTP(w, r)
    } else {
      session, err := store.Get(r, "session-name")
      if err != nil {
        rendering.HTML(w, http.StatusInternalServerError, "error", http.StatusInternalServerError)
      }
      if _, ok := session.Values["Endpoint"]; ok {
        h.ServeHTTP(w, r)
      } else {
        http.Redirect(w, r, "/login", http.StatusTemporaryRedirect)
      }
    }
  })
}

// To parse GET /object/secret-keys output
type UserSecretKeysResult struct {
  XMLName xml.Name `xml:"user_secret_keys"`
  SecretKey1 string `xml:"secret_key_1"`
  SecretKey2 string `xml:"secret_key_2"`
}

type UserSecretKeyResult struct {
  XMLName xml.Name `xml:"user_secret_key"`
  SecretKey string `xml:"secret_key"`
}

// Login using an AD or object user
func Login(w http.ResponseWriter, r *http.Request) {
  // If informaton received from the form
  if r.Method == "POST" {
    session, err := store.Get(r, "session-name")
    if err != nil {
      rendering.HTML(w, http.StatusInternalServerError, "error", http.StatusInternalServerError)
    }
    session.Values = make(map[interface{}]interface{})
    err = sessions.Save(r, w)
    if err != nil {
      rendering.HTML(w, http.StatusInternalServerError, "error", http.StatusInternalServerError)
    }
    r.ParseForm()
    authentication := r.FormValue("authentication")
    user := r.FormValue("user")
    password := r.FormValue("password")
    endpoint := r.FormValue("endpoint")
    // For AD authentication, needs to retrieve the S3 secret key from ECS using the ECS management API
    if authentication == "ad" {
      url, err := url.Parse(endpoint)
      if err != nil{
          rendering.HTML(w, http.StatusOK, "login", "Check the endpoint")
      }
      hostname := url.Host
      if strings.Contains(hostname, ":") {
        hostname = strings.Split(hostname, ":")[0]
      }
      tr := &http.Transport{
        TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
      }
      client := &http.Client{Transport: tr}
      // Get an authentication token from ECS
      req, _ := http.NewRequest("GET", "https://" + hostname + ":4443/login", nil)
      req.SetBasicAuth(user, password)
      resp, err := client.Do(req)
      if err != nil{
          log.Print(err)
      }
      if resp.StatusCode == 401 {
        rendering.HTML(w, http.StatusOK, "login", "Check your crententials and that you're allowed to generate a secret key on ECS")
      } else {
        // Get the secret key from ECS
        req, _ = http.NewRequest("GET", "https://" + hostname + ":4443/object/secret-keys", nil)
        headers := map[string][]string{}
        headers["X-Sds-Auth-Token"] = []string{resp.Header.Get("X-Sds-Auth-Token")}
        req.Header = headers
        resp, err = client.Do(req)
        if err != nil{
            log.Print(err)
        }
        buf := new(bytes.Buffer)
        buf.ReadFrom(resp.Body)
        secretKey := ""
        userSecretKeysResult := &UserSecretKeysResult{}
        xml.NewDecoder(buf).Decode(userSecretKeysResult)
        secretKey = userSecretKeysResult.SecretKey1
        // If a secret key doesn't exist yet for this object user, needs to generate it
        if secretKey == "" {
          req, _ = http.NewRequest("POST", "https://" + hostname + ":4443/object/secret-keys", bytes.NewBufferString("<secret_key_create_param></secret_key_create_param>"))
          headers["Content-Type"] = []string{"application/xml"}
          req.Header = headers
          resp, err = client.Do(req)
          if err != nil{
              log.Print(err)
          }
          buf = new(bytes.Buffer)
          buf.ReadFrom(resp.Body)
          userSecretKeyResult := &UserSecretKeyResult{}
          xml.NewDecoder(buf).Decode(userSecretKeyResult)
          secretKey = userSecretKeyResult.SecretKey
        }
        session.Values["AccessKey"] = user
        session.Values["SecretKey"] = secretKey
        session.Values["Endpoint"] = endpoint
        err = sessions.Save(r, w)
        if err != nil {
          rendering.HTML(w, http.StatusInternalServerError, "error", http.StatusInternalServerError)
        }
        http.Redirect(w, r, "/", http.StatusTemporaryRedirect)
      }
    // For an object user authentication, use the credentials as-is
    } else if authentication == "objectuser" {
      session.Values["AccessKey"] = user
      session.Values["SecretKey"] = password
      session.Values["Endpoint"] = endpoint
      err = sessions.Save(r, w)
      if err != nil {
        rendering.HTML(w, http.StatusInternalServerError, "error", http.StatusInternalServerError)
      }
      http.Redirect(w, r, "/", http.StatusTemporaryRedirect)
    } else if authentication == "adminuser" {
      session.Values["User"] = user
      session.Values["Password"] = password
      session.Values["Endpoint"] = endpoint
      err = sessions.Save(r, w)
      if err != nil {
        rendering.HTML(w, http.StatusInternalServerError, "error", http.StatusInternalServerError)
      }
      http.Redirect(w, r, "/", http.StatusTemporaryRedirect)
    }
  } else {
    rendering.HTML(w, http.StatusOK, "login", nil)
  }
}

// Logout
func Logout(w http.ResponseWriter, r *http.Request) {
  session, err := store.Get(r, "session-name")
  if err != nil {
    rendering.HTML(w, http.StatusInternalServerError, "error", http.StatusInternalServerError)
  }
  delete(session.Values, "AccessKey")
  delete(session.Values, "SecretKey")
  delete(session.Values, "Endpoint")
  err = sessions.Save(r, w)
  http.Redirect(w, r, "/", http.StatusTemporaryRedirect)
}
