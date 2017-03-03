package main

import (
  "encoding/json"
  "net/http"
  "github.com/gorilla/mux"
)

func BillingGetNamespaces(w http.ResponseWriter, r *http.Request) *appError {
  session, err := store.Get(r, "session-name")
  if err != nil {
    return &appError{err: err, status: http.StatusInternalServerError, json: http.StatusText(http.StatusInternalServerError)}
  }
  headers := make(map[string][]string)
  response, err := ecsRequest(session.Values["Endpoint"].(string), session.Values["User"].(string), session.Values["Password"].(string), "GET", "/object/namespaces.json", headers, "")
  if err != nil {
    return &appError{err: err, status: http.StatusInternalServerError, json: http.StatusText(http.StatusInternalServerError)}
  }
  rendering.Text(w, http.StatusOK, response.Body)

  return nil
}

func BillingGetUsers(w http.ResponseWriter, r *http.Request) *appError {
  vars := mux.Vars(r)
  session, err := store.Get(r, "session-name")
  if err != nil {
    return &appError{err: err, status: http.StatusInternalServerError, json: http.StatusText(http.StatusInternalServerError)}
  }
  headers := make(map[string][]string)
  response, err := ecsRequest(session.Values["Endpoint"].(string), session.Values["User"].(string), session.Values["Password"].(string), "GET", "/object/users/" + vars["namespace"] + ".json", headers, "")
  if err != nil {
    return &appError{err: err, status: http.StatusInternalServerError, json: http.StatusText(http.StatusInternalServerError)}
  }
  rendering.Text(w, http.StatusOK, response.Body)

  return nil
}

func BillingGetBuckets(w http.ResponseWriter, r *http.Request) *appError {
  vars := mux.Vars(r)
  session, err := store.Get(r, "session-name")
  if err != nil {
    return &appError{err: err, status: http.StatusInternalServerError, json: http.StatusText(http.StatusInternalServerError)}
  }
  headers := make(map[string][]string)
  response, err := ecsRequest(session.Values["Endpoint"].(string), session.Values["User"].(string), session.Values["Password"].(string), "GET", "/object/bucket.json?namespace=" + vars["namespace"], headers, "")
  if err != nil {
    return &appError{err: err, status: http.StatusInternalServerError, json: http.StatusText(http.StatusInternalServerError)}
  }
  rendering.Text(w, http.StatusOK, response.Body)

  return nil
}

type BillingParams struct {
	Buckets []string `json:"buckets"`
	From string `json:"from"`
	To string `json:"to"`
  BucketDetails bool `json:"bucket_details"`
}

func BillingGetCurrentUsage(w http.ResponseWriter, r *http.Request) *appError {
  vars := mux.Vars(r)
  session, err := store.Get(r, "session-name")
  if err != nil {
    return &appError{err: err, status: http.StatusInternalServerError, json: http.StatusText(http.StatusInternalServerError)}
  }
  decoder := json.NewDecoder(r.Body)
  var billingParams BillingParams
  err = decoder.Decode(&billingParams)
  if err != nil {
    return &appError{err: err, status: http.StatusBadRequest, json: "Can't decode JSON data"}
  }
  buckets := billingParams.Buckets
  if len(buckets) > 0 {
    bucketsXml := "<bucket_list>"
    for _, bucket := range buckets {
      bucketsXml += "<id>" + bucket + "</id>"
    }
    bucketsXml += "</bucket_list>"
    headers := make(map[string][]string)
    headers["Content-Type"] = []string{"application/xml"}
    if billingParams.From != "" && billingParams.To != "" {
      response, err := ecsRequest(session.Values["Endpoint"].(string), session.Values["User"].(string), session.Values["Password"].(string), "POST", "/object/billing/buckets/" + vars["namespace"] + "/sample.json?start_time=" + billingParams.From + "&end_time=" + billingParams.To, headers, bucketsXml)
      if err != nil {
        return &appError{err: err, status: http.StatusInternalServerError, json: http.StatusText(http.StatusInternalServerError)}
      }
      rendering.Text(w, http.StatusOK, response.Body)
    } else {
      response, err := ecsRequest(session.Values["Endpoint"].(string), session.Values["User"].(string), session.Values["Password"].(string), "POST", "/object/billing/buckets/" + vars["namespace"] + "/info.json", headers, bucketsXml)
      if err != nil {
        return &appError{err: err, status: http.StatusInternalServerError, json: http.StatusText(http.StatusInternalServerError)}
      }
      rendering.Text(w, http.StatusOK, response.Body)
    }
  } else {
    namespacesXml := "<namespace_list><id>" + vars["namespace"] + "</id></namespace_list>"
    headers := make(map[string][]string)
    optionalQueryParams := "include_bucket_detail=false"
    if billingParams.BucketDetails {
      optionalQueryParams = "include_bucket_detail=true"
    }
    headers["Content-Type"] = []string{"application/xml"}
    if billingParams.From != "" && billingParams.To != "" {
      response, err := ecsRequest(session.Values["Endpoint"].(string), session.Values["User"].(string), session.Values["Password"].(string), "POST", "/object/billing/namespace/sample.json?start_time=" + billingParams.From + "&end_time=" + billingParams.To + "&" + optionalQueryParams, headers, namespacesXml)
      if err != nil {
        return &appError{err: err, status: http.StatusInternalServerError, json: http.StatusText(http.StatusInternalServerError)}
      }
      rendering.Text(w, http.StatusOK, response.Body)
    } else {
      response, err := ecsRequest(session.Values["Endpoint"].(string), session.Values["User"].(string), session.Values["Password"].(string), "POST", "/object/billing/namespace/info.json" + "?" + optionalQueryParams, headers, namespacesXml)
      if err != nil {
        return &appError{err: err, status: http.StatusInternalServerError, json: http.StatusText(http.StatusInternalServerError)}
      }
      rendering.Text(w, http.StatusOK, response.Body)
    }
  }

  return nil
}
