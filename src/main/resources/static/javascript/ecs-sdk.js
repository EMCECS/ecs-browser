/*

 Copyright (c) 2017, EMC Corporation

 All rights reserved.

 Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * Neither the name of the EMC Corporation nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

 THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES,
 INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

 */
function isNonEmptyString(theString) {
  return (theString && theString.trim() && (theString != ""));
};

function combineWithSlash( part1, part2 ) {
  var combination;
  if (!isNonEmptyString(part2)) {
    combination = part1;
  } else if (part2.startsWith('/')) {
    if (part1.endsWith('/')) {
      combination = part1 + part2.substring(1);
    } else {
      combination = part1 + part2;
    }
  } else if (part1.endsWith('/')) {
    combination = part1 + part2;
  } else {
    combination = part1 + '/' + part2;
  }
  return combination;
};

function handleData( data, callback, dataProcessor ) {
  if ((!data.code) || (( data.code >= 200 ) && ( data.code < 300 ))) {
    if (dataProcessor) {
      data = dataProcessor( data );
    }
    callback( null, data );
  } else {
    handleError( callback, data, null, null );
  }
};

function handleError ( callback, data, errorThrown, textStatus ) {
  if (!data.status) {
    data.statusText = "Server not running";
    data.status = "REJECTED";
  }
  callback( { statusCode: data.status, errorThrown: errorThrown, message: data.statusText }, null );
};

var _metadataStart = 'x-amz-meta-';

function getErrorMessage( code ) {
  if (( code >= 200 ) && ( code < 300 )) {
    return "Success!";
  } else if ( code == 400 ) {
    return "Bad Request";
  } else if ( code == 401 ) {
    return "Unauthorized";
  } else if ( code == 402 ) {
    return "Payment Required";
  } else if ( code == 403 ) {
    return "Forbidden";
  } else if ( code == 404 ) {
    return "Not Found";
  } else if ( code == 405 ) {
    return "Method Not Allowed";
  } else if ( code == 406 ) {
    return "Not Acceptable";
  } else if ( code == 407 ) {
    return "Proxy Authentication Required";
  } else if ( code == 408 ) {
    return "Request Timeout";
  } else if ( code == 409 ) {
    return "Conflict";
  } else if ( code == 410 ) {
    return "Gone";
  } else if ( code == 413 ) {
    return "Payload Too Large";
  } else if ( code == 500 ) {
    return "Internal Server Error";
  } else if ( code == 501 ) {
    return "Not Implemented";
  } else if ( code == 502 ) {
    return "Bad Gateway";
  } else if ( code == 503 ) {
    return "Service Unavailable";
  } else if ( code == 504 ) {
    return "Gateway Timeout";
  } else if ( code == 505 ) {
    return "HTTP Version Not Supported";
  } else if ( code == 507 ) {
    return "Insufficient Storage";
  } else if ( code == 511 ) {
    return "Network Authentication Required";
  } else {
    return "Failure";
  }
};

function makeMetaData( data ) {
  var metaData = {};
  if (data && data.headers) {
    for (var key in data.headers) {
      if (data.headers.hasOwnProperty(key)) {
        if (!key.toLowerCase().startsWith(_metadataStart)) {
          metaData[ keyProcessor(key) ] = data.headers[key];
        } else {
          if (!metaData.Metadata) {
            metaData.Metadata = {};
          }
          metaData.Metadata[ key.substring(_metadataStart.length) ] = data.headers[key];
        }
      }
    }
  }
  return metaData;
};

function keyProcessor( key ) {
  var processedKey = '';
  var afterGap = false;
  for (var i = 0, keyLength = key.length; i < keyLength; ++i) {
    var theCharacter = key[i];
    if (characterBetweenInclusive(theCharacter, 'a', 'z') ||
        characterBetweenInclusive(theCharacter, 'A', 'Z') || 
        characterBetweenInclusive(theCharacter, '0', '9')) {
      if (processedKey === '') {
        theCharacter = theCharacter.toLowerCase();
      }
      processedKey = processedKey + theCharacter;
    }
  }
  return processedKey;
};

function characterBetweenInclusive( theCharacter, startCharacter, endCharacter ) {
  return (theCharacter >= startCharacter) && (theCharacter <= endCharacter);
};

function getEcsBody( data ) {
  return data.body;
};

EcsS3 = function( s3Params ) {
    this.endpoint = s3Params.endpoint;
    this.accessKeyId = s3Params.accessKeyId;
    this.secretAccessKey = s3Params.secretAccessKey;
    this.sslEnabled = s3Params.sslEnabled;
    this.s3ForcePathStyle = s3Params.s3ForcePathStyle;
    this.configuration = s3Params;
};

EcsS3.prototype.headBucket = function( bucketParams, callback ) {
    var apiUrl = this.getBucketApiUrl(bucketParams);
    var headers = this.getHeaders('HEAD');
    var processData = function( data ) {
        var metaData = makeMetaData(data);
        metaData.type = FileRow.ENTRY_TYPE.BUCKET;
        return metaData;
    };
    $.ajax({ url: apiUrl,  method: 'POST', headers: headers,
        success: function(data, textStatus, jqHXR) {
            handleData( data, callback, processData );
        },
        error: function(jqHXR, textStatus, errorThrown) {
            handleError( callback,  jqHXR, errorThrown, textStatus );
        },
    });
};

EcsS3.prototype.headObject = function( objectParams, callback ) {
    var apiUrl = this.getObjectApiUrl(objectParams);
    var headers = this.getHeaders('HEAD');
    var processData = function( data ) {
        var metaData = makeMetaData(data);
        metaData.type = FileRow.ENTRY_TYPE.REGULAR;
        return metaData;
    };
    $.ajax({ url: apiUrl,  method: 'POST', headers: headers,
        success: function(data, textStatus, jqHXR) {
            handleData( data, callback, processData );
        },
        error: function(jqHXR, textStatus, errorThrown) {
            handleError( callback,  jqHXR, errorThrown, textStatus );
        },
    });
};

EcsS3.prototype.listBuckets = function(callback ) {
    var apiUrl = this.getSystemApiUrl();
    var headers = this.getHeaders('GET');
    
    $.ajax({ url: apiUrl,  method: 'POST', headers: headers,
        success: function(data, textStatus, jqHXR) {
            handleData( data, callback, getEcsBody );
        },
        error: function(jqHXR, textStatus, errorThrown) {
            handleError( callback,  jqHXR, errorThrown, textStatus );
        },
    });

};

EcsS3.prototype.listObjects = function( bucketParams, callback ) {
    var apiUrl = this.getBucketApiUrl(bucketParams);
    var separatorChar = '?';
    if (isNonEmptyString(bucketParams.Delimiter)) {
      apiUrl = apiUrl + separatorChar + 'delimiter=' + bucketParams.Delimiter;
      separatorChar = '&';
    };
    if (isNonEmptyString(bucketParams.Prefix)) {
      apiUrl = apiUrl + separatorChar + 'prefix=' + bucketParams.Prefix;
      separatorChar = '&';
    };
    var headers = this.getHeaders('GET');
    
    $.ajax({ url: apiUrl,  method: 'POST', headers: headers,
        success: function(data, textStatus, jqHXR) {
            handleData( data, callback, getEcsBody );
        },
        error: function(jqHXR, textStatus, errorThrown) {
            handleError( callback,  jqHXR, errorThrown, textStatus );
        },
    });
};

EcsS3.prototype.getBucketAcl = function( bucketParams, callback ) {
    var apiUrl = this.getBucketApiUrl(bucketParams) + '?acl';
    var headers = this.getHeaders('GET');
    
    $.ajax({ url: apiUrl,  method: 'POST', headers: headers,
        success: function(data, textStatus, jqHXR) {
            handleData( data, callback, getEcsBody );
        },
        error: function(jqHXR, textStatus, errorThrown) {
            handleError( callback,  jqHXR, errorThrown, textStatus );
        },
    });
};

EcsS3.prototype.getObjectAcl = function( objectParams, callback ) {
    var apiUrl = this.getObjectApiUrl(objectParams) + '?acl';
    var headers = this.getHeaders('GET');
    
    $.ajax({ url: apiUrl,  method: 'POST', headers: headers,
        success: function(data, textStatus, jqHXR) {
            handleData( data, callback, getEcsBody );
        },
        error: function(jqHXR, textStatus, errorThrown) {
            handleError( callback,  jqHXR, errorThrown, textStatus );
        },
    });
};

EcsS3.prototype.putObject = function( objectParams, callback ) {
    var apiUrl = this.getObjectApiUrl(objectParams);
    var headers = this.getHeaders('PUT');
    
    var data = objectParams.Body ? objectParams.Body : '';
    var contentType = objectParams.Body ? data.type : 'application/octet-stream';
    if (!isNonEmptyString(contentType)) {
       contentType = 'multipart/form-data';
    }
    $.ajax({ url: apiUrl,  method: 'POST', headers: headers, data: data, processData: false, contentType: contentType,
        success: function(data, textStatus, jqHXR) {
            handleData( data, callback );
        },
        error: function(jqHXR, textStatus, errorThrown) {
            handleError( callback,  jqHXR, errorThrown, textStatus );
        },
    });
};

EcsS3.prototype.copyObject = function( objectParams, callback ) {
    var apiUrl = this.getObjectApiUrl(objectParams);
    var headers = this.getHeaders('PUT');
    var copySource = objectParams.CopySource;
    if (!copySource.startsWith('/')) {
      copySource = '/' + copySource;
    }
    headers['X-amz-copy-source'] = copySource;
    if (objectParams.Metadata) {
      for (var key in objectParams.Metadata) {
        if (objectParams.Metadata.hasOwnProperty(key)) {
          headers[_metadataStart + key] = objectParams.Metadata[key];
        }
      }
    }
    if (isNonEmptyString(objectParams.MetadataDirective)) {
        headers['X-amz-metadata-directive'] = objectParams.MetadataDirective;
    }
    
    $.ajax({ url: apiUrl,  method: 'POST', headers: headers,
        success: function(data, textStatus, jqHXR) {
            handleData( data, callback );
        },
        error: function(jqHXR, textStatus, errorThrown) {
            handleError( callback,  jqHXR, errorThrown, textStatus );
        },
    });
};


EcsS3.prototype.deleteObject = function( objectParams, callback ) {
    var apiUrl = this.getObjectApiUrl(objectParams);
    var headers = this.getHeaders('DELETE');
    
    $.ajax({ url: apiUrl,  method: 'POST', headers: headers,
        success: function(data, textStatus, jqHXR) {
            handleData( data, callback );
        },
        error: function(jqHXR, textStatus, errorThrown) {
            handleError( callback,  jqHXR, errorThrown, textStatus );
        },
    });
};

EcsS3.prototype.getHeaders = function( passthroughMethod ) {
    var headers = {
        'X-Passthrough-Endpoint': this.endpoint,
        'X-Passthrough-Key': this.accessKeyId,
        'X-Passthrough-Secret': this.secretAccessKey,
        'X-Passthrough-Method': passthroughMethod,
        'Accept': 'application/json',
        'Content-Type': 'application/octet-stream'
    };
    return headers;
};

EcsS3.prototype.getSystemApiUrl = function() {
    return 'http://localhost:8080/service/';
};

EcsS3.prototype.getBucketApiUrl = function( params ) {
    return combineWithSlash( this.getSystemApiUrl(), params.Bucket );
};

EcsS3.prototype.getObjectApiUrl = function( params ) {
    return combineWithSlash( this.getBucketApiUrl( params ), params.Key );
};

