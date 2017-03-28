$(document).ready(function() {
  $('[data-toggle="tooltip"]').tooltip();
  $('[data-toggle="popover"]').popover();
});

var encodingTypeNames = {"1":"encodingtype", "2":"encoding-type"};
var startAfterNames = {"1":"marker", "2":"start-after"};

function isNonEmptyString(theString) {
  return (theString && theString.trim() && (theString != ""));
}

if (!String.prototype.encodeHTML) {
  String.prototype.encodeHTML = function () {
    return this.replace(/&/g, '&amp;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;')
               .replace(/"/g, '&quot;')
               .replace(/'/g, '&apos;');
  };
}

jQuery.expr[':'].regex = function(elem, index, match) {
    var matchParams = match[3].split(','),
        validLabels = /^(data|css):/,
        attr = {
            method: matchParams[0].match(validLabels) ?
                        matchParams[0].split(':')[0] : 'attr',
            property: matchParams.shift().replace(validLabels,'')
        },
        regexFlags = 'ig',
        regex = new RegExp(matchParams.join('').replace(/^s+|s+$/g,''), regexFlags);
    return regex.test(jQuery(elem)[attr.method](attr.property));
}

function formatXml(xml) {
    var formatted = '';
    var reg = /(>)(<)(\/*)/g;
    xml = xml.replace(reg, '$1\r\n$2$3');
    var pad = 0;
    jQuery.each(xml.split('\r\n'), function(index, node) {
        var indent = 0;
        if (node.match( /.+<\/\w[^>]*>$/ )) {
            indent = 0;
        } else if (node.match( /^<\/\w/ )) {
            if (pad != 0) {
                pad -= 1;
            }
        } else if (node.match( /^<\w[^>]*[^\/]>.*$/ )) {
            indent = 1;
        } else {
            indent = 0;
        }

        var padding = '';
        for (var i = 0; i < pad; i++) {
            padding += '  ';
        }

        formatted += padding + node + '\r\n';
        pad += indent;
    });

    return formatted;
}

function processXmlBody(body) {
  return "<pre><code>" + formatXml(body).encodeHTML() + "</code></pre>";
}

function processXmlData(data) {
  data["body"] = processXmlBody(data["body"]);
  return data;
}

(function() {
  var app = angular.module('ECS-BROWSER', ['ngAnimate', 'ngSanitize']);

  app.value('loadingService', {
    loadingCount: 0,
    isLoading: function() { return loadingCount > 0; },
    requested: function() { loadingCount += 1; },
    responded: function() { loadingCount -= 1; }
  });

  app.factory('loadingInterceptor', ['$q', 'loadingService', function($q, loadingService) {
    return {
      request: function(config) {
        loadingService.requested();
        return config;
      },
      response: function(response) {
        loadingService.responded();
        return response;
      },
      responseError: function(rejection) {
        loadingService.responded();
        return $q.reject(rejection);
      },
    }
  }]);

  app.config(["$httpProvider", function ($httpProvider) {
    $httpProvider.interceptors.push('loadingInterceptor');
  }]);

  app.controller('MainController', ['$http', '$animate', '$scope', '$timeout', 'loadingService', 'mainService', function($http, $animate, $scope, $timeout, loadingService, mainService) {
    $scope.main = mainService;
    loadingCount = 0;
    $scope.main.s3login = $('#s3login').val();
    $scope.loadingService = loadingService;
    $scope.main.replicationgroups = [];
    $scope.main.defaultreplicationgroup = "";
    $scope.main.atmossubtenants = [];
    $scope.main.swiftcontainers = [];
    $scope.main.response = {};
    $scope.main.buckets = [];
    $scope.main.examples = {};
    $scope.main.credentials = {};
    $scope.main.metadata = {};
    $scope.main.metadata.markers = [];
    $scope.main.apis = {};
    $scope.main.apis.headers = {};
    $scope.main.apis.response = {};
    $scope.main.examples.response = {};
    $scope.main.swiftextensions = {};
    $scope.main.swiftextensions.headers = {};
    $scope.main.swiftextensions.response = {};
    $scope.main.html5browser = false;
    $scope.main.menu = "";
    $scope.main.api = "";
    $scope.main.billing = {};
    $scope.main.swiftendpoint = "";
    $scope.main.atmosendpoint = "";
    $http.get('/api/v1/examples').success(function(data) {
      $scope.main.examples = data;
    }).
    error(function(data, status, headers, config) {
      $scope.main.messagetitle = "Error";
      $scope.main.messagebody = data;
      $('#message').modal('show');
    });
    if($scope.main.s3login == "true") {
      $http.get('/api/v1/buckets').success(function(data) {
        $scope.main.buckets = data;
      }).
      error(function(data, status, headers, config) {
        $scope.main.messagetitle = "Error";
        $scope.main.messagebody = data;
        $('#message').modal('show');
      });
      $http.get('/api/v1/credentials').success(function(data) {
        $scope.main.credentials = data;
        var link = document.createElement('a');
        link.setAttribute('href', data["endpoint"]);
        if((link.port == 9020)||(link.port == 9021)) {
          $scope.main.swiftendpoint = link.protocol + "//" + link.hostname + ":" + (parseInt(link.port) + 4) + "/auth/v1.0";
          $scope.main.atmosendpoint = link.protocol + "//" + link.hostname + ":" + (parseInt(link.port) + 2);
        }
        if(data["html5browser"] != "") {
          $scope.main.html5browser = true;
          $("#html5browser")[0].src = data["html5browser"]
          $("#html5browser")[0].onload = function() {
            try {
              $("#html5browser")[0].contentWindow.postMessage($scope.main.credentials, 'http://10.64.231.196:9020');
              console.log("Credentials sent to Iframe");
            } catch (error) {
                console.log(error);
            }
          }
        }
      }).
      error(function(data, status, headers, config) {
        $scope.main.messagetitle = "Error";
        $scope.main.messagebody = data;
        $('#message').modal('show');
      });
      $http.get('/api/v1/ecs/info').success(function(data) {
        if(data) {
          $scope.main.replicationgroups = data["user-allowed-replication-groups"];
          $scope.main.defaultreplicationgroup = data["default-replication-group"];
          $timeout(function(){
            $scope.bucketCreateCtrl.bucket_replication_group = $scope.main.defaultreplicationgroup ;
          });
          if(data["atmos-subtenants"]) {
            $scope.main.atmossubtenants = data["atmos-subtenants"];
          }
          if(data["swift-containers"]) {
            $scope.main.swiftcontainers = data["swift-containers"];
          }
        }
      }).
      error(function(data, status, headers, config) {
        console.log(data);
        /*
        $scope.main.messagetitle = "Error";
        $scope.main.messagebody = data;
        $('#message').modal('show');
        */
      });
    }
  }]);

  app.factory('mainService', function() {
    return {}
  });

  app.directive("mainMenu", function() {
    return {
      restrict: 'E',
      templateUrl: "app/html/main-menu.html"
    };
  });

  app.directive("mainMessage", function() {
    return {
      restrict: 'E',
      templateUrl: "app/html/main-message.html"
    };
  });

  app.directive("mainCredentials", function() {
    return {
      restrict: 'E',
      templateUrl: "app/html/main-credentials.html"
    };
  });

  app.directive("mainBucketcreate", function() {
    return {
      restrict: 'E',
      templateUrl: "app/html/main-bucketcreate.html",
      controller: ['$http', '$scope', 'mainService', function($http, $scope, mainService) {
        this.bucket_retention = 0;
        this.bucket_expiration_current_versions = 0;
        this.bucket_expiration_non_current_versions = 0;
        this.create = function(api) {
          if(this.bucket_expiration_current_versions < this.bucket_retention && this.bucket_expiration_current_versions != 0) {
            $scope.main.messagetitle = "Error";
            $scope.main.messagebody = "Expiration of current versions must be higher than or equal to retention";
            $('#message').modal('show');
          } else {
            bucket_name = this.bucket_name;
            $http.post('/api/v1/bucket', {
              bucket_api: api,
              bucket_endpoint: $("#bucket_endpoint").val(),
              bucket_password: this.bucket_password,
              bucket_name: this.bucket_name,
              bucket_replication_group: this.bucket_replication_group,
              bucket_metadata_search: this.bucket_metadata_search,
              bucket_enable_ado: this.bucket_enable_ado,
              bucket_enable_fs: this.bucket_enable_fs,
              bucket_enable_compliance: this.bucket_enable_compliance,
              bucket_enable_encryption: this.bucket_enable_encryption,
              bucket_retention: this.bucket_retention.toString(),
              bucket_enable_versioning: this.bucket_enable_versioning,
              bucket_expiration_current_versions: this.bucket_expiration_current_versions.toString(),
              bucket_expiration_non_current_versions: this.bucket_expiration_non_current_versions.toString()
            }).
              success(function(data, status, headers, config) {
                $scope.main.messagetitle = "Success";
                if(api == "s3") {
                  $scope.main.messagebody = "Bucket " + bucket_name + " created";
                  $http.get('/api/v1/buckets').success(function(data) {
                    $scope.main.buckets = data;
                  }).
                  error(function(data, status, headers, config) {
                    $scope.main.messagetitle = "Error";
                    $scope.main.messagebody = data;
                    $('#message').modal('show');
                  });
                }
                if(api == "atmos") {
                  $scope.main.messagebody = "Subtenant " + data + " created";
                  $scope.main.atmossubtenants.push(data);
                }
                if(api == "swift") {
                  $scope.main.messagebody = "Container " + bucket_name + " created";
                  $scope.main.swiftcontainers.push(bucket_name);
                }
                $('#message').modal({show: true});
              }).
              error(function(data, status, headers, config) {
                $scope.main.result = [];
                $scope.main.messagetitle = "Error";
                $scope.main.messagebody = data;
                $('#message').modal({show: true});
              });
          }
        };
      }],
      controllerAs: "bucketCreateCtrl"
    };
  });

  app.directive("mainList", function() {
    return {
      restrict: 'E',
      templateUrl: "app/html/main-list.html",
      controller: ['$http', '$scope', 'mainService', function($http, $scope, mainService) {
        this.create = function(api) {
            bucket_name = this.bucket_name;
            var apiUrl = '/api/v1/' + api + '/' + bucket_name + '/';
            var separator = '?'
            if(api == "s3") {
              if (isNonEmptyString(this.delimiter)) {
                apiUrl = apiUrl + separator + 'delimiter=' + this.delimiter;
                separator = '&';
              }
              if (isNonEmptyString(this.encodingType)) {
                apiUrl = apiUrl + separator + encodingTypeNames[this.listType] + '=' + this.encodingType;
                separator = '&';
                if (this.listType == '2') {
	                apiUrl = apiUrl + separator + encodingTypeNames['1'] + '=' + this.encodingType;
                }
              }
              if (this.maxKeys && (this.maxKeys > 0)) {
                apiUrl = apiUrl + separator + 'max-keys=' + this.maxKeys;
                separator = '&';
              }
              if (isNonEmptyString(this.prefix)) {
                apiUrl = apiUrl + separator + 'prefix=' + this.prefix;
                separator = '&';
              }
              if (isNonEmptyString(this.startAfter)) {
                apiUrl = apiUrl + separator + startAfterNames[this.listType] + '=' + this.startAfter;
                separator = '&';
                if (this.listType == '2') {
	                apiUrl = apiUrl + separator + startAfterNames['1'] + '=' + this.startAfter;
                }
              }
              if (this.listType != '1') {
                apiUrl = apiUrl + separator + 'list-type=2';
                if (isNonEmptyString(this.continuationToken)) {
                  apiUrl = apiUrl + '&continuation-token=' + this.continuationToken;
                }
                if (isNonEmptyString(this.fetchOwner)) {
                  apiUrl = apiUrl + '&fetch-owner=' + this.fetchOwner;
                }
              }
            }
            $scope.main.response = {};
            $http({
                method: "POST", 
                url: apiUrl, 
                headers: { "X-Passthrough-Method": "GET" }
            }).then(
                function successCallback(response) {
                    $scope.main.response = processXmlData(response.data);
                },
                function errorCallback(response) {
                    $scope.main.result = [];
                    $scope.main.messagetitle = "Error";
                    $scope.main.messagebody = response.data;
                    $('#message').modal({show: true});
                }
            );
        };
      }],
      controllerAs: "listCtrl"
    };
  });

  app.directive("mainVersionlist", function() {
    return {
      restrict: 'E',
      templateUrl: "app/html/main-versionlist.html",
      controller: ['$http', '$scope', 'mainService', function($http, $scope, mainService) {
        this.create = function(api) {
            bucket_name = this.bucket_name;
            var apiUrl = '/api/v1/' + api + '/' + bucket_name + '/?versions';
            if(api == "s3") {
              if (isNonEmptyString(this.delimiter)) {
                apiUrl = apiUrl + '&delimiter=' + this.delimiter;
              }
              if (isNonEmptyString(this.encodingType)) {
                apiUrl = apiUrl + '&encoding-type=' + this.encodingType;
              }
              if (isNonEmptyString(this.keyMarker)) {
                apiUrl = apiUrl + '&key-marker=' + this.keyMarker;
              }
              if (this.maxKeys && (this.maxKeys > 0)) {
                apiUrl = apiUrl + '&max-keys=' + this.maxKeys;
              }
              if (isNonEmptyString(this.prefix)) {
                apiUrl = apiUrl + '&prefix=' + this.prefix;
              }
              if (isNonEmptyString(this.versionIdMarker)) {
                apiUrl = apiUrl + '&version-id-marker=' + this.versionIdMarker;
              }
            }
            $scope.main.response = {};
            $http({
                method: "POST", 
                url: apiUrl, 
                headers: { "X-Passthrough-Method": "GET" }
            }).then(
                function successCallback(response) {
                    $scope.main.response = processXmlData(response.data);
                },
                function errorCallback(response) {
                    $scope.main.result = [];
                    $scope.main.messagetitle = "Error";
                    $scope.main.messagebody = response.data;
                    $('#message').modal({show: true});
                }
            );
        };
      }],
      controllerAs: "versionlistCtrl"
    };
  });

  app.directive("mainObject", function() {
    return {
      restrict: 'E',
      templateUrl: "app/html/main-object.html",
      controller: ['$http', '$scope', 'mainService', function($http, $scope, mainService) {
        this.operation = 'GET';
        this.scope = 'Object';
        this.submit = function(api) {
            bucket_name = this.bucket_name;
            object_name = this.object_name;
            var apiUrl = '/api/v1/' + api + '/' + bucket_name + '/' + object_name;
            var separator = '?';
            var body = '';
            var requestHeaders = {};
            requestHeaders["X-Passthrough-Method"] = this.operation;

            if (api == "s3") {
              if (((this.operation == 'PUT') || (this.operation == 'GET')) && (this.scope == 'ACL')) {
                apiUrl = apiUrl + '?acl';
                separator = '&';
              }

              if (this.operation == 'PUT') {
                if (isNonEmptyString(this.xAmzAcl)) {
                  requestHeaders["X-amz-acl"] = this.xAmzAcl;
                }
                if (isNonEmptyString(this.xAmzGrantRead)) {
                  requestHeaders["X-amz-grant-read"] = this.xAmzGrantRead;
                }
                if (isNonEmptyString(this.xAmzGrantReadAcp)) {
                  requestHeaders["X-amz-grant-read-acp"] = this.xAmzGrantReadAcp;
                }
                if (isNonEmptyString(this.xAmzGrantWriteAcp)) {
                  requestHeaders["X-amz-grant-write-acp"] = this.xAmzGrantWriteAcp;
                }
                if (isNonEmptyString(this.xAmzGrantFullControl)) {
                  requestHeaders["X-amz-grant-full-control"] = this.xAmzGrantFullControl;
                }
              }
              if ((this.operation != 'PUT') || (this.scope != 'Object')) {
                if (isNonEmptyString(this.versionId)) {
                  apiUrl = apiUrl + separator + 'versionId=' + this.versionId;
                }
              } else if (this.scope == 'ACL') {
                body = this.acl
              } else {
                var file = document.getElementById('file').files[0];
                if (!file) {
                  alert("You must select a file to upload.");
                  return;
                }
                requestHeaders["Content-Type"] = undefined;
                if (isNonEmptyString(this.content)) {
                  requestHeaders["Content"] = this.content;
                }
                if (isNonEmptyString(this.range)) {
                  requestHeaders["Range"] = this.range;
                }
                if (isNonEmptyString(this.retentionPeriod)) {
                  requestHeaders["X-retention-period"] = this.retentionPeriod;
                }
                if (isNonEmptyString(this.retentionPolicy)) {
                  requestHeaders["X-retention-policy"] = this.retentionPolicy;
                }

                var fd = new FormData();
                fd.append('file', file);
                $http.post(apiUrl, fd, {
                  transformRequest: angular.identity,
                  headers: requestHeaders
                }).then(
                  function successCallback(response) {
                    $scope.main.response = processXmlData(response.data);
                  },
                  function errorCallback(response) {
                    $scope.main.result = [];
                    $scope.main.messagetitle = "Error";
                    $scope.main.messagebody = response.data;
                    $('#message').modal({show: true});
                  }
                );
                return;
              }

              if ((this.operation == 'HEAD') || ((this.operation == 'GET') && (this.scope == 'Object'))) {
                if (isNonEmptyString(this.range)) {
                  requestHeaders["Range"] = this.range;
                }
                if (isNonEmptyString(this.ifModifiedSince)) {
                  requestHeaders["If-Modified-Since"] = this.ifModifiedSince;
                }
                if (isNonEmptyString(this.ifUnmodifiedSince)) {
                  requestHeaders["If-Unmodified-Since"] = this.ifUnmodifiedSince;
                }
                if (isNonEmptyString(this.ifMatch)) {
                  requestHeaders["If-Match"] = this.ifMatch;
                }
                if (isNonEmptyString(this.ifNoneMatch)) {
                  requestHeaders["If-None-Match"] = this.ifNoneMatch;
                }
              }

              if (this.operation == 'DELETE') {
                if (isNonEmptyString(this.xAmzMfa)) {
                  requestHeaders["X-amz-mfa"] = this.xAmzMfa;
                }
              }
            }
            $scope.main.response = {};
            $http({
                method: "POST", 
                url: apiUrl, 
                headers: requestHeaders,
                data: body
            }).then(
                function successCallback(response) {
                    $scope.main.response = processXmlData(response.data);
                },
                function errorCallback(response) {
                    $scope.main.result = [];
                    $scope.main.messagetitle = "Error";
                    $scope.main.messagebody = response.data;
                    $('#message').modal({show: true});
                }
            );
        };
      }],
      controllerAs: "objectCtrl"
    };
  });

  app.directive("mainBucket", function() {
    return {
      restrict: 'E',
      templateUrl: "app/html/main-bucket.html",
      controller: ['$http', '$scope', 'mainService', function($http, $scope, mainService) {
        this.operation = 'GET';
        this.scope = 'Bucket';
        this.listType = '1';
        this.submit = function(api) {
            bucket_name = this.bucket_name;
            var apiUrl = '/api/v1/' + api + '/' + bucket_name;
            var separator = '?';
            var body = '';
            var requestHeaders = {};
            requestHeaders["X-Passthrough-Method"] = this.operation;
            if ((this.operation != 'PUT') && isNonEmptyString(this.xEmcNamespace)) {
              requestHeaders["X-Passthrough-Namespace"] = this.xEmcNamespace;
            }

            if (api == "s3") {
              if (((this.operation == 'GET') || (this.operation == 'HEAD')) && (this.scope == 'Versions')) {
                  apiUrl = apiUrl + separator + 'versions';
                  separator = '&';
                }
              if ((this.operation == 'GET') || (this.operation == 'HEAD')) {
                if (isNonEmptyString(this.delimiter)) {
                  apiUrl = apiUrl + separator + 'delimiter=' + this.delimiter;
                  separator = '&';
                }
                if (isNonEmptyString(this.encodingType)) {
                  apiUrl = apiUrl + separator + encodingTypeNames[this.listType] + '=' + this.encodingType;
                  separator = '&';
                  if (this.listType == '2') {
	                  apiUrl = apiUrl + separator + encodingTypeNames['1'] + '=' + this.encodingType;
                  }
                }
                if (this.maxKeys && (this.maxKeys > 0)) {
                  apiUrl = apiUrl + separator + 'max-keys=' + this.maxKeys;
                  separator = '&';
                }
                if (isNonEmptyString(this.prefix)) {
                  apiUrl = apiUrl + separator + 'prefix=' + this.prefix;
                  separator = '&';
                }
                if (isNonEmptyString(this.keyMarker)) {
                  if (this.scope == 'Versions') {
                    apiUrl = apiUrl + separator + 'key-marker=' + this.keyMarker;
                    separator = '&';
                  } else if (this.scope == 'Bucket') {
                    apiUrl = apiUrl + separator + startAfterNames[this.listType] + '=' + this.keyMarker;
                    separator = '&';
                    if (this.listType == '2') {
	                  apiUrl = apiUrl + separator + startAfterNames['1'] + '=' + this.keyMarker;
                    }
                  }
                }
                if (this.scope == 'Versions') {
                  if (isNonEmptyString(this.versionIdMarker)) {
                      apiUrl = apiUrl + separator + 'version-id-marker=' + this.versionIdMarker;
                      separator = '&';
                  }
                } else if (this.listType != '1') {
                  apiUrl = apiUrl + separator + 'list-type=2';
                  if (isNonEmptyString(this.continuationToken)) {
                    apiUrl = apiUrl + '&continuation-token=' + this.continuationToken;
                  }
                  if (isNonEmptyString(this.fetchOwner)) {
                    apiUrl = apiUrl + '&fetch-owner=' + this.fetchOwner;
                  }
                }
              }

              if (this.operation == 'PUT') {
                if (isNonEmptyString(this.xEmcNamespace)) {
                  requestHeaders["X-emc-namespace"] = this.xEmcNamespace;
                }
                if (isNonEmptyString(this.xEmcVpool)) {
                  requestHeaders["X-emc-vpool"] = this.xEmcVpool;
                }
                if (isNonEmptyString(this.xAmzAcl)) {
                  requestHeaders["X-amz-acl"] = this.xAmzAcl;
                }
                if (isNonEmptyString(this.xAmzGrantRead)) {
                  requestHeaders["X-amz-grant-read"] = this.xAmzGrantRead;
                }
                if (isNonEmptyString(this.xAmzGrantWrite)) {
                  requestHeaders["X-amz-grant-write"] = this.xAmzGrantWrite;
                }
                if (isNonEmptyString(this.xAmzGrantReadAcp)) {
                  requestHeaders["X-amz-grant-read-acp"] = this.xAmzGrantReadAcp;
                }
                if (isNonEmptyString(this.xAmzGrantWriteAcp)) {
                  requestHeaders["X-amz-grant-write-acp"] = this.xAmzGrantWriteAcp;
                }
                if (isNonEmptyString(this.xAmzGrantFullControl)) {
                  requestHeaders["X-amz-grant-full-control"] = this.xAmzGrantFullControl;
                }
                if (isNonEmptyString(this.xEmcRetentionPeriod)) {
                  requestHeaders["X-emc-retention-period"] = this.xEmcRetentionPeriod;
                }
                if (isNonEmptyString(this.xEmcFileSystemAccessEnabled)) {
                  requestHeaders["X-emc-file-system-access-enabled"] = this.xEmcFileSystemAccessEnabled;
                }
                if (isNonEmptyString(this.xEmcIsStaleAllowed)) {
                  requestHeaders["X-emc-is-stale-allowed"] = this.xEmcIsStaleAllowed;
                }
                if (isNonEmptyString(this.xEmcComplianceEnabled)) {
                  requestHeaders["X-emc-compliance-enabled"] = this.xEmcComplianceEnabled;
                }
                if (isNonEmptyString(this.xEmcServerSideEncryptionEnabled)) {
                  requestHeaders["X-emc-server-side-encryption-enabled"] = this.xEmcServerSideEncryptionEnabled;
                }
                if (isNonEmptyString(this.xEmcMetadataSearch)) {
                  requestHeaders["X-emc-metadata-search"] = this.xEmcMetadataSearch;
                }
              }
            }
            $scope.main.response = {};
            $http({
                method: "POST", 
                url: apiUrl, 
                headers: requestHeaders,
                data: body
            }).then(
                function successCallback(response) {
                    $scope.main.response = processXmlData(response.data);
                },
                function errorCallback(response) {
                    $scope.main.result = [];
                    $scope.main.messagetitle = "Error";
                    $scope.main.messagebody = response.data;
                    $('#message').modal({show: true});
                }
            );
        };
      }],
      controllerAs: "bucketCtrl"
    };
  });

  app.directive("mainMetadataSearch", function() {
    return {
      restrict: 'E',
      templateUrl: "app/html/main-metadata-search.html",
      controller: ['$http', '$scope', 'mainService', function($http, $scope, mainService) {
        this.search = function(marker) {
          if(marker) {
            $scope.main.metadata.markers.push(marker);
          } else {
            $scope.main.metadata.markers = [];
          }
          $http.post('/api/v1/metadatasearch', {
            search_bucket: this.search_bucket,
            search_query: this.search_query.replace(/ /g, "%20"),
            search_max_keys: this.search_max_keys,
            search_sorted_by: this.search_sorted_by,
            search_return_all_metadata: this.search_return_all_metadata,
            search_marker: marker
          }).
            success(function(data, status, headers, config) {
              $scope.main.metadata.result = data;
            }).
            error(function(data, status, headers, config) {
              $scope.main.metadata.result = [];
              $scope.main.messagetitle = "Error";
              $scope.main.messagebody = data;
              $('#message').modal({show: true});
            });
        };
        this.getMetadata = function() {
          $http.post('/api/v1/searchmetadata', {
            search_bucket: this.search_bucket
          }).
            success(function(data, status, headers, config) {
              $scope.main.searchmetadata = data;
            }).
            error(function(data, status, headers, config) {
              $scope.main.searchmetadata = [];
              $scope.main.messagetitle = "Error";
              $scope.main.messagebody = data;
              $('#message').modal({show: true});
            });
        };
      }],
      controllerAs: "metadataSearchCtrl"
    };
  });

  app.directive("mainMetadataResult", function() {
    return {
      restrict: 'E',
      templateUrl: "app/html/main-metadata-result.html"
    };
  });

  app.directive("mainEcsBilling", function() {
    return {
      restrict: 'E',
      templateUrl: "app/html/main-ecs-billing.html",
      controller: ['$http', '$scope', 'mainService', function($http, $scope, mainService) {
        this.getNamespaces = function() {
          $scope.main.billing["namespaces"] = {};
          $http.get('/api/v1/billing/namespaces').
            success(function(data, status, headers, config) {
              $scope.main.billing["namespaces"] = data;
            }).
            error(function(data, status, headers, config) {
              $scope.main.messagetitle = "Error";
              $scope.main.messagebody = data;
              $('#message').modal({show: true});
          });
        };
        this.getUsers = function() {
          $scope.main.billing["users"] = {};
          $scope.main.billing["buckets"] = {};
          $scope.main.billing["info"] = {};
          $http.get('/api/v1/billing/users/' + this.namespace).
            success(function(data, status, headers, config) {
              $scope.main.billing["users"] = data;
            }).
            error(function(data, status, headers, config) {
              $scope.main.messagetitle = "Error";
              $scope.main.messagebody = data;
              $('#message').modal({show: true});
          });
        };
        this.getBuckets = function() {
          $scope.main.billing["buckets"] = {};
          $scope.main.billing["info"] = {};
          $http.get('/api/v1/billing/buckets/' + this.namespace).
            success(function(data, status, headers, config) {
              $scope.main.billing["buckets"] = data;
            }).
            error(function(data, status, headers, config) {
              $scope.main.messagetitle = "Error";
              $scope.main.messagebody = data;
              $('#message').modal({show: true});
          });
        };
        this.getInfo = function(scope) {
          $scope.main.billing["info"] = {};
          buckets = [];
          if(scope == "bucket") {
            buckets.push(this.bucket);
          }
          if(scope == "buckets") {
            current_user = this.user;
            current_user = $('#billing_user').val();
            $scope.main.billing["buckets"]['object_bucket'].forEach(function(bucket) {
              if(bucket["owner"] == current_user) {
                buckets.push(bucket["name"]);
              }
            });
          }
          $http.post('/api/v1/billing/info/' + this.namespace, {buckets: buckets, from: this.from, to: this.to, bucket_details: this.bucket_details}).
            success(function(data, status, headers, config) {
              $scope.main.billing["info"] = data;
            }).
            error(function(data, status, headers, config) {
              $scope.main.messagetitle = "Error";
              $scope.main.messagebody = data;
              $('#message').modal({show: true});
          });
        };
      }],
      controllerAs: "ecsBillingCtrl"
    };
  });

  app.directive("mainEcsBillingResult", function() {
    return {
      restrict: 'E',
      templateUrl: "app/html/main-ecs-billing-result.html"
    };
  });

  app.directive("mainApis", function() {
    return {
      restrict: 'E',
      templateUrl: "app/html/main-apis.html",
      controller: ['$http', '$scope', 'mainService', function($http, $scope, mainService) {
        this.apis_method = "GET";
        this.apis_path = "/";
        this.execute = function(api) {
          $scope.main.apis.response = {};
          var customHeaders = {};
          for (var key in $scope.main.apis.headers) {
            customHeaders[key] = [$("#apis_header_" + key).val()];
          }
          $http.post('/api/v1/apis', {
            apis_api: api,
            apis_endpoint: $("#apis_endpoint").val(),
            apis_user: this.apis_user,
            apis_password: this.apis_password,
            apis_bucket: this.apis_bucket,
            apis_container: this.apis_container,
            apis_subtenant: this.apis_subtenant,
            apis_path: this.apis_path,
            apis_range: this.apis_range,
            apis_data: this.apis_data,
            apis_method: this.apis_method,
            apis_headers: customHeaders
          }).
            success(function(data, status, headers, config) {
              $scope.main.apis.response = processXmlData(data);
            }).
            error(function(data, status, headers, config) {
              $scope.main.messagetitle = "Error";
              $scope.main.messagebody = data;
              $('#message').modal({show: true});
            });
        };
        this.addHeader = function() {
          $scope.main.apis.headers[this.apis_custom_header] = "";
        };
        this.removeHeader = function() {
          delete $scope.main.apis.headers[this.apis_custom_header];
        };
        this.executeStep = function(i, j, api, execute) {
          //$('html, body').animate({scrollTop: $('#apis_request')}, 100);
          if(!$scope.main.examples.response) {
            $scope.main.examples.response = {};
          }
          if(!$scope.main.examples.response[api]) {
            $scope.main.examples.response[api] = {};
          }
          if(!$scope.main.examples.response[api][i]) {
            $scope.main.examples.response[api][i] = {};
          }
          $scope.main.examples.response[api][i][j] = {};
          var customHeaders = {};
          var expectedResponseCode = $("input[id^='api_examples_expected_response_code_" + i + "_" + j + "']").val();
          var responseCodeButton = $("#api_examples_response_code_" + i + "_" + j);
          responseCodeButton.removeClass("btn-success").removeClass("btn-danger");
          responseCodeButton.html("-");
          $("input[id^='api_examples_header_key_" + i + "_" + j + "']").each (function() {
            var key = $(this).val();
            var k = $(this).attr('id').substr($(this).attr('id').length - 1);
            var value = $("input[id^='api_examples_header_value_" + i + "_" + j + "_" + k + "']").val();
            customHeaders[key] = [value];
          });
          elements = {};
          elementsKeys = ["apis_container", "apis_subtenant", "api_examples_path_" + i + "_" + j, "api_examples_range_" + i + "_" + j, "api_examples_data_" + i + "_" + j]
          for(var l = 0; l < elementsKeys.length; l++) {
            elements[elementsKeys[l]] = $("#" + elementsKeys[l]).val();
          }
          var headersInput = $("input[id^='api_examples_header_key_" + i + "_" + j + "']");
          $("span[id^='api_examples_input_key_" + i + "_" + j + "']").each (function() {
            var inputKey = $(this).html();
            var inputK = $(this).attr('id').substr($(this).attr('id').length - 1);
            var inputValue = $("#api_examples_input_" + i + "_" + j + "_" + inputK).val();
            if(inputValue != "") {
              var regExp = new RegExp("X{3}" + inputKey + "X{3}","gm");
              for(var l = 0; l < elementsKeys.length; l++) {
                if($("#" + elementsKeys[l]).val()) {
                  elements[elementsKeys[l]] = elements[elementsKeys[l]].replace(regExp, inputValue);
                }
              }
              Object.keys(customHeaders).forEach(function (key) {
                customHeaders[key][0] = customHeaders[key][0].replace(regExp, inputValue);
              });
            }
          });
          if(execute) {
            $http.post('/api/v1/apis', {
              apis_api: api,
              apis_endpoint: $("#apis_endpoint").val(),
              apis_user: $("#apis_user").val(),
              apis_password: $("#apis_password").val(),
              apis_bucket: $("#apis_bucket").val(),
              apis_container: elements["apis_container"],
              apis_subtenant: elements["apis_subtenant"],
              apis_path: elements["api_examples_path_" + i + "_" + j],
              apis_range: elements["api_examples_range_" + i + "_" + j],
              apis_data: elements["api_examples_data_" + i + "_" + j],
              apis_method: $("#api_examples_method_" + i + "_" + j).val(),
              apis_headers: customHeaders
            }).
              success(function(data, status, headers, config) {
                $scope.main.examples.response[api][i][j] = data;
                $scope.main.apis.response = processXmlData(data);
                if($scope.main.apis.response["code"] == expectedResponseCode) {
                  responseCodeButton.addClass("btn-success");
                } else {
                  responseCodeButton.addClass("btn-danger");
                }
                responseCodeButton.attr('data-content', formatXml($scope.main.apis.response["body"]).encodeHTML());
                responseCodeButton.html($scope.main.apis.response["code"]);
                //$('html, body').animate({scrollTop: $('#apis_request')}, 100);
              }).
              error(function(data, status, headers, config) {
                $scope.main.messagetitle = "Error";
                $scope.main.messagebody = data;
                $('#message').modal({show: true});
              });
          } else {
            $scope.main.messagetitle = "CLI";
            login = "";
            body = "";
            cli = "";
            if(api == "s3") {
              cli = "perl s3curl.pl --id=ecs_profile -- -X " + $("#api_examples_method_" + i + "_" + j).val();
            } else if((api == "ecs" || api =="swift")) {
              cli = "curl -k -X " + $("#api_examples_method_" + i + "_" + j).val();
            }
            if(elements["api_examples_data_" + i + "_" + j]) {
              if((api == "s3") || (api == "ecs")) {
                body += `
                  Create a file called data.txt with the following content:
                  <ul class="list-group">
                    <li class="list-group-item">
                      ` + elements["api_examples_data_" + i + "_" + j].replace(/\n/, "<br />") + `
                    </li>
                  </ul>
                `;
              }
              if(api == "s3") {
                cli += " -d @data.txt";
              } else if(api == "ecs") {
                cli += ` -T data.txt`;
              } else {
                cli += ` -H "Content-Type: plain/text" --data-binary "` + elements["api_examples_data_" + i + "_" + j] + `"`;
              }
            }
            if(elements["api_examples_range_" + i + "_" + j] != "") {
              cli += " -H 'Range:" + elements["api_examples_range_" + i + "_" + j] + "'";
            }
            Object.keys(customHeaders).forEach(function (key) {
              cli += " -H '" + key + ":" + customHeaders[key][0] + "'";
            });
            if(api == "s3") {
              login += `
              Create a file .s3curl with 0600 permissions and the following content:
              <ul class="list-group">
                <li class="list-group-item">
                  %awsSecretAccessKeys = (<br />
                    ecs_profile => {<br />
                      id => '` + $scope.main.credentials['access-key'] + `',<br />
                      key => '` + $scope.main.credentials['secret-key'] + `'<br />
                    },<br />
                    @endpoints = ('` + $scope.main.credentials['endpoint'].split('/')[2].split(':')[0] + `', )
                  );
                </li>
              </ul>
              `;
              if($("#apis_bucket").val() == "") {
                cli += " -vv '" + $scope.main.credentials['endpoint'] + elements["api_examples_path_" + i + "_" + j] + "'";
              } else {
                cli += " -vv '" + $scope.main.credentials['endpoint'] + "/" + $("#apis_bucket").val() + elements["api_examples_path_" + i + "_" + j] + "'";
              }
            } else if(api == "swift") {
              login = `
                Execute the following commands to login:
                <ul class="list-group">
                  <li class="list-group-item">
                    export TOKEN=\`curl -s -k -i -H 'X-Auth-User:` + $("#apis_user").val() + `' -H 'X-Auth-Key:` + $("#apis_password").val() + `' ` + $("#apis_endpoint").val() + `/auth/v1.0 | grep -i X-Auth-Token | awk '{ print $2 }' | tr -d '\\015'\`<br />
                    export STORAGEURL=\`curl -s -k -i -H 'X-Auth-User:` + $("#apis_user").val() + `' -H 'X-Auth-Key:` + $("#apis_password").val() + `' ` + $("#apis_endpoint").val() + `/auth/v1.0 | grep -i X-Storage-Url | awk '{ print $2 }' | tr -d '\\015'\`
                  </li>
                </ul>
              `
              cli += ` -H "X-Auth-Token:$TOKEN" -vv "$STORAGEURL` + elements["api_examples_path_" + i + "_" + j] + `"`;
            } else if(api == "ecs") {
              login = `
                Execute the following command to login:
                <ul class="list-group">
                  <li class="list-group-item">
                    export TOKEN=\`curl -s -k -i -u ` + $("#apis_user").val() + `:` + $("#apis_password").val() + ` ` + $("#apis_endpoint").val() + `/login 2>&1 | grep -i X-Sds-Auth-Token | awk '{ print $2 }' | sed 's/^M//g'\`
                  </li>
                </ul>
              `
              cli += " -H \"X-SDS-AUTH-TOKEN:$TOKEN\" " + $("#apis_endpoint").val() + elements["api_examples_path_" + i + "_" + j] + " | xmllint --format -";
            }
            $scope.main.messagebody = login + body + `
              Then, run the following command:
              <ul class="list-group">
                <li class="list-group-item">
                  ` + cli + `
                </li>
              </ul>
            `;
            $('#message').modal({show: true});
          }
        };
        this.showResponse = function(i, j, api) {
          if($scope.main.examples.response && $scope.main.examples.response[api] && $scope.main.examples.response[api][i] && $scope.main.examples.response[api][i][j]) {
            $scope.main.messagetitle = "Response";
            var content = `
            <h2>Response headers</h2>
            <table class="table">
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
            `;
            Object.keys($scope.main.examples.response[api][i][j]["response_headers"]).forEach (function(key) {
              content += "<tr><td>" + key + "</td>";
              content += "<td>" + $scope.main.examples.response[api][i][j]["response_headers"][key][0] + "</td></tr>";
            });
            content += `
              </tbody>
            </table>
            <h2>Response body</h2>
            `;
            content += `<div class="wordbreak">` + formatXml($scope.main.examples.response[api][i][j]["body"]) + `</div>`;
            $scope.main.messagebody = content;
            $('#message').modal({show: true});
          } else {
            $scope.main.messagetitle = "Error";
            $scope.main.messagebody = "You need to execute the step first";
            $('#message').modal({show: true});
          }
        };
      }],
      controllerAs: "apisCtrl"
    };
  });

  app.directive("mainApisExamples", function() {
    return {
      restrict: 'E',
      templateUrl: "app/html/main-apis-examples.html"
    };
  });

  app.directive("mainApisRequest", function() {
    return {
      restrict: 'E',
      templateUrl: "app/html/main-apis-request.html"
    };
  });

  app.directive("mainApisResponse", function() {
    return {
      restrict: 'E',
      templateUrl: "app/html/main-apis-response.html"
    };
  });

  app.directive("mainHtml5browser", function() {
    return {
      restrict: 'E',
      templateUrl: "app/html/main-html5browser.html"
    };
  });

})();
