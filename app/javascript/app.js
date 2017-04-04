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

  app.directive("responsePanel", function() {
    return {
      restrict: 'E',
      templateUrl: "app/html/response-panel.html",
    };
  });

  app.directive("mainObject", function() {
    return {
      restrict: 'E',
      templateUrl: "app/html/main-object.html",
      controller: ['$http', '$scope', 'mainService', function($http, $scope, mainService) {
        this.operation = 'GET';
        this.scope = 'Object';
        this.submit = function(api, subApi) {
            bucket_name = this.bucket_name;
            object_name = this.object_name;
            var apiUrl = '/api/v1/' + api + '/' + bucket_name + '/' + object_name;
            var separator = '?';
            var body = '';
            var requestHeaders = {};
            requestHeaders["Accept"] = 'application/xml';
            requestHeaders["X-Passthrough-Method"] = this.operation;
            if (isNonEmptyString(this.xEmcNamespace)) {
              requestHeaders["X-Passthrough-Namespace"] = this.xEmcNamespace;
            }

            if (api == "s3") {
              if (((this.operation == 'PUT') || (this.operation == 'GET')) && (subApi == 'ACL')) {
                apiUrl = apiUrl + '?acl';
                separator = '&';
              }

              if ((this.operation == 'HEAD') || (((this.operation == 'GET') || (this.operation == 'PUT')) && (subApi == 'Object'))) {
                if (isNonEmptyString(this.ifNoneMatch)) {
                  requestHeaders["If-None-Match"] = this.ifNoneMatch;
                }
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
              if ((this.operation != 'PUT') || (subApi != 'Object')) {
                if (isNonEmptyString(this.versionId)) {
                  apiUrl = apiUrl + separator + 'versionId=' + this.versionId;
                }
              } else if (subApi == 'ACL') {
                body = this.body
              } else {
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
                if (isNonEmptyString(this.xAmzCopySource)) {
                  requestHeaders["X-amz-copy-source"] = this.xAmzCopySource;
                  if (isNonEmptyString(this.xAmzMetadataDirective)) {
                    requestHeaders["X-amz-metadata-directive"] = this.xAmzMetadataDirective;
                  }
                } else {
                  var file = document.getElementById('file').files[0];
                  if (!file) {
                    alert("You must select either a file to upload or an object to copy.");
                    return;
                  }
                  requestHeaders["Content-Type"] = undefined;

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
              }

              if ((this.operation == 'HEAD') || ((this.operation == 'GET') && (subApi == 'Object'))) {
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
              }

              if (this.operation == 'DELETE') {
                if (isNonEmptyString(this.xAmzMfa)) {
                  requestHeaders["X-amz-mfa"] = this.xAmzMfa;
                }
              }
            }
            doSubmit($scope, $http, apiUrl, requestHeaders, body);
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
        this.listType = '1';
        this.submit = function(api, subApi) {
          if (subApi == 'ADO') {
            this.operation = 'PUT';
          } else if (subApi == 'Location') {
            this.operation = 'GET';
          }

          bucket_name = this.bucket_name;
          var apiUrl = '/api/v1/' + api + '/' + bucket_name;
          var separator = '?';
          var body = '';
          var requestHeaders = {};
          requestHeaders["X-Passthrough-Method"] = this.operation;
          requestHeaders["Accept"] = 'application/xml';
          if ((this.operation != 'PUT') && isNonEmptyString(this.xEmcNamespace)) {
            requestHeaders["X-Passthrough-Namespace"] = this.xEmcNamespace;
          }

          if (api == "s3") {
            if (((this.operation == 'GET') || (this.operation == 'HEAD')) && (subApi == 'Versions')) {
                apiUrl = apiUrl + separator + 'versions';
                separator = '&';
            }
            if (((this.operation == 'PUT') || (this.operation == 'GET')) && (subApi == 'ACL')) {
              apiUrl = apiUrl + separator + 'acl';
              separator = '&';
            }
            if (((this.operation == 'PUT') || (this.operation == 'GET') || (this.operation == 'DELETE')) && (subApi == 'CORS')) {
              apiUrl = apiUrl + separator + 'cors';
              separator = '&';
            }
            if ((this.operation == 'PUT') && (subApi == 'ADO')) {
              apiUrl = apiUrl + separator + 'isstaleallowed';
            }
            if ((this.operation == 'GET') && (subApi == 'Location')) {
              apiUrl = apiUrl + separator + 'location';
            }
            if ((this.operation == 'PUT') && ((subApi == 'ACL') || (subApi == 'CORS'))) {
              body = this.body;
              requestHeaders["Content-type"] = 'application/xml';
            }
            if (subApi == 'Metadata') {
              if ((this.operation == 'DELETE') || ((this.operation == 'GET') && this.keysOnly)) {
                apiUrl = apiUrl + separator + 'searchmetadata';
                separator = '&';
              } else if (this.operation == 'GET') {
                if (isNonEmptyString(this.metadataQuery)) {
                  apiUrl = apiUrl + separator + 'query=' + this.metadataQuery;
                  separator = '&';
                }
                if (isNonEmptyString(this.extraMetadata)) {
                  apiUrl = apiUrl + separator + 'attributes=' + this.extraMetadata;
                  separator = '&';
                }
                if (isNonEmptyString(this.sortKey)) {
                  apiUrl = apiUrl + separator + 'sorted=' + this.sortKey;
                  separator = '&';
                }
                apiUrl = apiUrl + separator + 'include-older-versions=' + (this.includeOlderVersions ? 'true' : 'false');
                separator = '&';
                if (this.maxKeys && (this.maxKeys > 0)) {
                  apiUrl = apiUrl + separator + 'max-keys=' + this.maxKeys;
                }
                if (isNonEmptyString(this.keyMarker)) {
                  apiUrl = apiUrl + separator + 'marker=' + this.keyMarker;
                }
              }
            }
            if (((this.operation == 'GET') || (this.operation == 'HEAD')) && ((subApi == 'Bucket') || (subApi == 'Versions'))) {
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
                if (subApi == 'Versions') {
                  apiUrl = apiUrl + separator + 'key-marker=' + this.keyMarker;
                  separator = '&';
                } else if (subApi == 'Bucket') {
                  apiUrl = apiUrl + separator + startAfterNames[this.listType] + '=' + this.maxKeys;
                  separator = '&';
                  if (this.listType == '2') {
      	            apiUrl = apiUrl + separator + startAfterNames['1'] + '=' + this.keyMarker;
                  }
                }
              }
              if (subApi == 'Versions') {
                if (isNonEmptyString(this.versionIdMarker)) {
                    apiUrl = apiUrl + separator + 'version-id-marker=' + this.versionIdMarker;
                    separator = '&';
                }
              } else if (this.listType != '1') {
                apiUrl = apiUrl + separator + 'list-type=2';
                if (isNonEmptyString(this.continuationToken)) {
                  apiUrl = apiUrl + '&continuation-token=' + this.continuationToken;
                }
                apiUrl = apiUrl + '&fetch-owner=' + this.fetchOwner;
              }
            }

            if (this.operation == 'PUT') {
              if ((subApi == 'Bucket') || (subApi == 'ACL')) {
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
              }
              if (subApi == 'Bucket') {
                if (isNonEmptyString(this.xEmcNamespace)) {
                  requestHeaders["X-emc-namespace"] = this.xEmcNamespace;
                }
                if (isNonEmptyString(this.xEmcVpool)) {
                  requestHeaders["X-emc-vpool"] = this.xEmcVpool;
                }
                if (isNonEmptyString(this.xEmcRetentionPeriod)) {
                  requestHeaders["X-emc-retention-period"] = this.xEmcRetentionPeriod;
                }
                if (isNonEmptyString(this.xEmcFileSystemAccessEnabled)) {
                  requestHeaders["X-emc-file-system-access-enabled"] = this.xEmcFileSystemAccessEnabled;
                }
              }
              if ((subApi == 'Bucket') || (subApi == 'ADO')) {
                requestHeaders["X-emc-is-stale-allowed"] = this.xEmcIsStaleAllowed;
              }
              if (subApi == 'Bucket') {
                requestHeaders["X-emc-compliance-enabled"] = this.xEmcComplianceEnabled;
                requestHeaders["X-emc-server-side-encryption-enabled"] = this.xEmcServerSideEncryptionEnabled;
                if (isNonEmptyString(this.xEmcMetadataSearch)) {
                  requestHeaders["X-emc-metadata-search"] = this.xEmcMetadataSearch;
                }
              }
            }
          }

          doSubmit($scope, $http, apiUrl, requestHeaders, body);
        };
      }],
      controllerAs: "bucketCtrl"
    };
  });

  doSubmit = function($scope, $http, apiUrl, requestHeaders, body) {
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

  app.directive("mainHtml5browser", function() {
    return {
      restrict: 'E',
      templateUrl: "app/html/main-html5browser.html"
    };
  });

})();
