package main

import (
  "encoding/json"
  "encoding/xml"
  "net/http"
  "strings"
  "strconv"
)

type ECSBucket struct {
  Api string `json:"bucket_api"`
  Endpoint string `json:"bucket_endpoint"`
  Password string `json:"bucket_password"`
  Name string `json:"bucket_name"`
  ReplicationGroup string `json:"bucket_replication_group"`
  MetadataSearch string `json:"bucket_metadata_search"`
  EnableADO bool `json:"bucket_enable_ado"`
  EnableFS bool `json:"bucket_enable_fs"`
  EnableCompliance bool `json:"bucket_enable_compliance"`
  EnableEncryption bool `json:"bucket_enable_encryption"`
  Retention string `json:"bucket_retention"`
  EnableVersioning bool `json:"bucket_enable_versioning"`
  ExpirationCurrentVersions string `json:"bucket_expiration_current_versions"`
  ExpirationNonCurrentVersions string `json:"bucket_expiration_non_current_versions"`
}

// Create a new bucket
func CreateBucket(w http.ResponseWriter, r *http.Request) *appError {
  decoder := json.NewDecoder(r.Body)
  var ecsBucket ECSBucket
  err := decoder.Decode(&ecsBucket)
  if err != nil {
    return &appError{err: err, status: http.StatusBadRequest, json: "Can't decode JSON data"}
  }
  headers := make(map[string][]string)
  if ecsBucket.ReplicationGroup != "" {
    headers["x-emc-vpool"] = []string{ecsBucket.ReplicationGroup}
  }
  if ecsBucket.MetadataSearch != "" {
    headers["x-emc-metadata-search"] = []string{ecsBucket.MetadataSearch}
  }
  if ecsBucket.EnableADO {
    headers["x-emc-is-stale-allowed"] = []string{"true"}
  } else {
    headers["x-emc-is-stale-allowed"] = []string{"false"}
  }
  if ecsBucket.EnableFS {
    headers["x-emc-file-system-access-enabled"] = []string{"true"}
  } else {
    headers["x-emc-file-system-access-enabled"] = []string{"false"}
  }
  if ecsBucket.EnableCompliance {
    headers["x-emc-compliance-enabled"] = []string{"true"}
  } else {
    headers["x-emc-compliance-enabled"] = []string{"false"}
  }
  if ecsBucket.EnableEncryption {
    headers["x-emc-server-side-encryption-enabled"] = []string{"true"}
  } else {
    headers["x-emc-server-side-encryption-enabled"] = []string{"false"}
  }
  retentionEnabled := false
  headers["x-emc-retention-period"] = []string{"0"}
  if ecsBucket.Retention != "" {
    days, err := strconv.ParseInt(ecsBucket.Retention, 10, 64)
    if err == nil {
      if days > 0 {
        seconds := days * 24 * 3600
        headers["x-emc-retention-period"] = []string{int64toString(seconds)}
        retentionEnabled = true
      }
    }
  }
  var expirationCurrentVersions int64
  expirationCurrentVersions = 0
  if ecsBucket.ExpirationCurrentVersions != "" {
    days, err := strconv.ParseInt(ecsBucket.ExpirationCurrentVersions, 10, 64)
    if err == nil {
      expirationCurrentVersions = days
    }
  }
  var expirationNonCurrentVersions int64
  expirationNonCurrentVersions = 0
  if ecsBucket.ExpirationNonCurrentVersions != "" {
    days, err := strconv.ParseInt(ecsBucket.ExpirationNonCurrentVersions, 10, 64)
    if err == nil && ecsBucket.EnableVersioning {
      expirationNonCurrentVersions = days
    }
  }
  var bucketCreateResponse Response
  if ecsBucket.Api == "s3" {
    s3, err := getS3(r)
    if err != nil {
      return &appError{err: err, status: http.StatusInternalServerError, json: http.StatusText(http.StatusInternalServerError)}
    }
    bucketCreateResponse, err = s3Request(s3, ecsBucket.Name, "PUT", "/", headers, "")
    if err != nil {
      return &appError{err: err, status: http.StatusInternalServerError, json: err.Error()}
    }
    versioningStatusOK := true
    lifecyclePolicyStatusOK := true
    // If the bucket has been created
    if bucketCreateResponse.Code == 200 {
      if !retentionEnabled && ecsBucket.EnableVersioning  {
        // Enable versioning
        enableVersioningHeaders := map[string][]string{}
        enableVersioningHeaders["Content-Type"] = []string{"application/xml"}
        versioningConfiguration := `
        <VersioningConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
          <Status>Enabled</Status>
          <MfaDelete>Disabled</MfaDelete>
        </VersioningConfiguration>
        `
        enableVersioningResponse, _ := s3Request(s3, ecsBucket.Name, "PUT", "/?versioning", enableVersioningHeaders, versioningConfiguration)
        if enableVersioningResponse.Code != 200 {
          versioningStatusOK = false
        }
      }
      if expirationCurrentVersions > 0 || expirationNonCurrentVersions > 0 {
        lifecyclePolicyHeaders := map[string][]string{}
        lifecyclePolicyHeaders["Content-Type"] = []string{"application/xml"}
        lifecyclePolicyConfiguration := `
        <LifecycleConfiguration>
          <Rule>
            <ID>expiration</ID>
            <Prefix></Prefix>
            <Status>Enabled</Status>
        `
        if expirationCurrentVersions > 0 && expirationNonCurrentVersions > 0 {
          // Enable expiration for both current and non current versions
          lifecyclePolicyConfiguration += "<Expiration><Days>" + ecsBucket.ExpirationCurrentVersions +  "</Days></Expiration>"
          lifecyclePolicyConfiguration += "<NoncurrentVersionExpiration><NoncurrentDays>" + ecsBucket.ExpirationNonCurrentVersions +  "</NoncurrentDays></NoncurrentVersionExpiration>"
        } else {
          if expirationCurrentVersions > 0 {
            // Enable expiration for current versions only
            lifecyclePolicyConfiguration += "<Expiration><Days>" + ecsBucket.ExpirationCurrentVersions +  "</Days></Expiration>"
          }
          if expirationNonCurrentVersions > 0 {
            // Enable expiration for non current versions only
            // To fix a bug in ECS 3.0 where an expiration for non current version can't be set if there's no expiration set for current versions
            lifecyclePolicyConfiguration += "<Expiration><Days>1000000</Days></Expiration>"
            lifecyclePolicyConfiguration += "<NoncurrentVersionExpiration><NoncurrentDays>" + ecsBucket.ExpirationNonCurrentVersions +  "</NoncurrentDays></NoncurrentVersionExpiration>"
          }
        }
        lifecyclePolicyConfiguration += `
          </Rule>
        </LifecycleConfiguration>
        `
        lifecyclePolicyResponse, _ := s3Request(s3, ecsBucket.Name, "PUT", "/?lifecycle", lifecyclePolicyHeaders, lifecyclePolicyConfiguration)
        if lifecyclePolicyResponse.Code != 200 {
          lifecyclePolicyStatusOK = false
        }
      }
      if versioningStatusOK && lifecyclePolicyStatusOK {
        rendering.JSON(w, http.StatusOK, "")
      } else {
        message := ""
        if !versioningStatusOK {
          message += " Versioning can't be enabled."
        }
        if !lifecyclePolicyStatusOK {
          message += " Expiration can't be set."
        }
        rendering.JSON(w, http.StatusOK, message)
      }
    } else {
      return &appError{err: err, status: http.StatusInternalServerError, xml: bucketCreateResponse.Body}
    }
  } else if ecsBucket.Api == "swift" {
    s3, err := getS3(r)
    if err != nil {
      return &appError{err: err, status: http.StatusInternalServerError, json: http.StatusText(http.StatusInternalServerError)}
    }
    bucketCreateResponse, err = swiftRequest(ecsBucket.Endpoint, s3.AccessKey, ecsBucket.Password, ecsBucket.Name, "PUT", "/", headers, "")
    if err != nil {
      return &appError{err: err, status: http.StatusInternalServerError, json: err.Error()}
    }
    if bucketCreateResponse.Code >= 200 && bucketCreateResponse.Code < 300  {
      rendering.JSON(w, http.StatusOK, ecsBucket.Name)
    } else {
      return &appError{err: err, status: http.StatusInternalServerError, xml: bucketCreateResponse.Body}
    }
  } else if ecsBucket.Api == "atmos" {
    s3, err := getS3(r)
    if err != nil {
      return &appError{err: err, status: http.StatusInternalServerError, json: http.StatusText(http.StatusInternalServerError)}
    }
    bucketCreateResponse, err = atmosRequest(ecsBucket.Endpoint, s3.AccessKey, s3.SecretKey, "", "PUT", "/rest/subtenant", headers, "")
    if err != nil {
      return &appError{err: err, status: http.StatusInternalServerError, json: err.Error()}
    }
    if bucketCreateResponse.Code >= 200 && bucketCreateResponse.Code < 300  {
      rendering.JSON(w, http.StatusOK, bucketCreateResponse.ResponseHeaders["Subtenantid"][0])
    } else {
      return &appError{err: err, status: http.StatusInternalServerError, xml: bucketCreateResponse.Body}
    }
  }

  return nil
}

// Retrieve the list of buckets owned by this object user
func ListBuckets(w http.ResponseWriter, r *http.Request) *appError {
  s3, err := getS3(r)
  if err != nil {
    return &appError{err: err, status: http.StatusInternalServerError, json: http.StatusText(http.StatusInternalServerError)}
  }
  response, _ := s3Request(s3, "", "GET", "/", make(map[string][]string), "")
  listBucketsResp := &ListBucketsResp{}
  xml.NewDecoder(strings.NewReader(response.Body)).Decode(listBucketsResp)
  buckets := []string{}
  for _, bucket := range listBucketsResp.Buckets {
    buckets = append(buckets, bucket.Name)
  }
  rendering.JSON(w, http.StatusOK, buckets)

  return nil
}
