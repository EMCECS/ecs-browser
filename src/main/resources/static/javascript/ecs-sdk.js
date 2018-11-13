/*
 * Copyright 2017 EMC Corporation. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *
 * http://www.apache.org/licenses/LICENSE-2.0.txt
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

var _s3Delimiter = '/';

function isNonEmptyString(theString) {
  return (theString && theString.trim() && (theString != ""));
};

function combineWithDelimiter( part1, part2 ) {
  var combination;
  if (!isNonEmptyString(part2)) {
    combination = part1;
  } else if (!isNonEmptyString(part1)) {
    combination = part2;
  } else if (part2.startsWith(_s3Delimiter)) {
    if (part1.endsWith(_s3Delimiter)) {
      combination = part1 + part2.substring(1);
    } else {
      combination = part1 + part2;
    }
  } else if (part1.endsWith(_s3Delimiter)) {
    combination = part1 + part2;
  } else {
    combination = part1 + _s3Delimiter + part2;
  }
  return combination;
};

function handleData( data, callback, dataProcessor ) {
  if ( ( data.status && ( ( data.status >= 200 ) && ( data.status < 300 ) ) ) 
    || ( data.statusCode && data.statusCode == 'OK') ) {
    if (dataProcessor) {
      data = dataProcessor( data );
    }
    callback( null, data );
  } else {
    handleError( callback, data, null, null );
  }
};

function handleError ( callback, data, errorThrown, textStatus ) {
  if ( !data.status ) {
    data = {
      status: 418,
      statusText: "No server found"
    };
  }
  callback( { status: data.status, errorThrown: errorThrown, message: data.statusText }, null );
};

var _metadataStart = 'x-amz-meta-';

function getErrorMessage( status ) {
  if ( ( status >= 200 ) && ( status < 300 ) ) {
    return "Success!";
  } else if ( status == 400 ) {
    return "Bad Request";
  } else if ( status == 401 ) {
    return "Unauthorized";
  } else if ( status == 402 ) {
    return "Payment Required";
  } else if ( status == 403 ) {
    return "Forbidden";
  } else if ( status == 404 ) {
    return "Not Found";
  } else if ( status == 405 ) {
    return "Method Not Allowed";
  } else if ( status == 406 ) {
    return "Not Acceptable";
  } else if ( status == 407 ) {
    return "Proxy Authentication Required";
  } else if ( status == 408 ) {
    return "Request Timeout";
  } else if ( status == 409 ) {
    return "Conflict";
  } else if ( status == 410 ) {
    return "Gone";
  } else if ( status == 413 ) {
    return "Payload Too Large";
  } else if ( status == 500 ) {
    return "Internal Server Error";
  } else if ( status == 501 ) {
    return "Not Implemented";
  } else if ( status == 502 ) {
    return "Bad Gateway";
  } else if ( status == 503 ) {
    return "Service Unavailable";
  } else if ( status == 504 ) {
    return "Gateway Timeout";
  } else if ( status == 505 ) {
    return "HTTP Version Not Supported";
  } else if ( status == 507 ) {
    return "Insufficient Storage";
  } else if ( status == 511 ) {
    return "Network Authentication Required";
  } else {
    return "Failure";
  }
};

function makeMetaData( data ) {
  var metaData = {};
  if ( data && data.headers ) {
    for ( var key in data.headers ) {
      if ( data.headers.hasOwnProperty( key ) ) {
        if ( !key.toLowerCase().startsWith( _metadataStart ) ) {
          metaData[ keyProcessor( key ) ] = data.headers[ key ];
        } else {
          if ( !metaData.Metadata ) {
            metaData.Metadata = {};
          }
          metaData.Metadata[ key.substring( _metadataStart.length ) ] = data.headers[ key ];
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

EcsS3.prototype.headAnything = function( params, callback ) {
    var apiUrl = this.getObjectApiUrl( params );
    var headers = this.getHeaders( 'HEAD' );
    var processData = function( data ) {
        if ( !data.headers ) {
          return data;
        }
        var metaData = makeMetaData( data );
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

EcsS3.prototype.getPresignedUrl = function( params, callback ) {
    var apiUrl = this.getObjectOrVersionApiUrl( params.entry );
    var headers = this.getHeaders( params.method );
    headers['X-Passthrough-Type'] = 'presign';
    headers['X-Passthrough-Expires'] = params.expires;
    headers['Content-Type'] = 'text/plain';
    headers['Accept'] = 'text/plain';

    $.ajax({ url: apiUrl,  method: 'POST', headers: headers,
        success: function(data, textStatus, jqHXR) {
            callback( null, data );
        },
        error: function(jqHXR, textStatus, errorThrown) {
            if ( !jqHXR.status ) {
                jqHXR = {
                    status: 418,
                    statusText: "No server found"
                };
            }
            callback( { status: jqHXR.status, errorThrown: errorThrown, message: jqHXR.statusText }, null );
        },
    });
};

EcsS3.prototype.listBuckets = function( callback ) {
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

EcsS3.prototype.listObjects = function( params, callback ) {
    var apiUrl = this.getBucketApiUrl( params.entry );
    var headers = this.getHeaders('GET');
    var separatorChar = '?';
    if ( isNonEmptyString( params.delimiter ) ) {
      apiUrl = apiUrl + separatorChar + 'delimiter=' + params.delimiter;
      separatorChar = '&';
    }
    if ( isNonEmptyString( params.entry.key ) ) {
      apiUrl = apiUrl + separatorChar + 'prefix=' + params.entry.key;
      separatorChar = '&';
    }
    if ( isNonEmptyString( params.extraQueryParameters ) ) {
      apiUrl = apiUrl + separatorChar + params.extraQueryParameters;
      separatorChar = '&';
    } else {
      headers['X-Passthrough-Type'] = 'listAll';
    }

    $.ajax({ url: apiUrl,  method: 'POST', headers: headers,
        success: function(data, textStatus, jqHXR) {
            handleData( data, callback, getEcsBody );
        },
        error: function(jqHXR, textStatus, errorThrown) {
            handleError( callback,  jqHXR, errorThrown, textStatus );
        },
    });
};

EcsS3.prototype.listVersions = function( parameters, callback ) {
    var apiUrl = this.getBucketApiUrl( parameters.entry ) + '?versions';
    if ( parameters.entry.key ) {
        apiUrl = apiUrl + '&prefix=' + parameters.entry.key;
    }
    if ( isNonEmptyString( parameters.delimiter ) ) {
        apiUrl = apiUrl + '&delimiter=' + parameters.delimiter;
    }
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

EcsS3.prototype.getAcl = function( entry, callback ) {
    var apiUrl = this.getObjectApiUrl( entry ) + '?acl';
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

EcsS3.prototype.putAcl = function( params, callback ) {
    var apiUrl = this.getObjectApiUrl( params.entry ) + '?acl';
    var headers = this.getHeaders('PUT');
    headers['ContentType'] = 'application/json';
    var data = JSON.stringify( params.accessControlPolicy );

    $.ajax({ url: apiUrl,  method: 'POST', headers: headers, data: data, contentType: "application/json",
        success: function(data, textStatus, jqHXR) {
            handleData( data, callback, getEcsBody );
        },
        error: function(jqHXR, textStatus, errorThrown) {
            handleError( callback,  jqHXR, errorThrown, textStatus );
        },
    });
};

EcsS3.prototype.getBucketVersioning = function( entry, callback ) {
    var apiUrl = this.getBucketApiUrl( entry ) + '?versioning';
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

EcsS3.prototype.putBucketVersioning = function( params, callback ) {
    var apiUrl = this.getObjectApiUrl( params.entry ) + '?versioning';
    var headers = this.getHeaders('PUT');
    headers['ContentType'] = 'application/json';
    var data = JSON.stringify( params.versioning );

    $.ajax({ url: apiUrl,  method: 'POST', headers: headers, data: data, contentType: "application/json",
        success: function(data, textStatus, jqHXR) {
            handleData( data, callback, getEcsBody );
        },
        error: function(jqHXR, textStatus, errorThrown) {
            handleError( callback,  jqHXR, errorThrown, textStatus );
        },
    });
};

EcsS3.prototype.putObject = function( params, callback ) {
    var apiUrl = this.getObjectApiUrl( params.entry );
    var headers = this.getHeaders( 'PUT' );
    if ( params.headers ) {
      for ( var key in params.headers ) {
        headers[key] = params.headers[key];
      }
    }
    var data = params.body ? params.body : '';
    var contentType = params.body ? data.type : 'application/octet-stream';
    if ( !isNonEmptyString( contentType ) ) {
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

EcsS3.prototype.copyObject = function( params, callback ) {
    var apiUrl = this.getObjectApiUrl( params.entry );
    var headers = this.getHeaders( 'PUT' );
    headers['X-amz-copy-source'] = this.getCopySource( params.entryToCopy );
    if ( params.metadata ) {
      for ( var key in params.metadata ) {
        if ( params.metadata.hasOwnProperty( key ) ) {
          headers[_metadataStart + key] = params.metadata[key];
        }
      }
    }
    if ( isNonEmptyString( params.metadataDirective ) ) {
        headers['X-amz-metadata-directive'] = params.metadataDirective;
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

EcsS3.prototype.deleteObject = function( entry, callback ) {
    var apiUrl = this.getObjectApiUrl( entry );
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

EcsS3.prototype.deleteVersion = function( entry, callback ) {
    var apiUrl = this.getObjectOrVersionApiUrl( entry );
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

EcsS3.prototype.restoreVersion = function( entry, callback ) {
    var apiUrl = this.getObjectApiUrl( entry );
    var headers = this.getHeaders( 'DELETE' );
    headers['X-amz-copy-source'] = this.getCopySource( entry );

    $.ajax({ url: apiUrl,  method: 'POST', headers: headers,
        success: function(data, textStatus, jqHXR) {
            handleData( data, callback );
        },
        error: function(jqHXR, textStatus, errorThrown) {
            handleError( callback,  jqHXR, errorThrown, textStatus );
        },
    });
};

EcsS3.prototype.downloadFolder = function( params, callback ) {
    var apiUrl = this.getBucketApiUrl( params.entry );
    var separatorChar = '?';
    if ( isNonEmptyString( params.entry.key ) ) {
        apiUrl = apiUrl + separatorChar + 'prefix=' + params.entry.key;
        separatorChar = '&';
    }
    if ( isNonEmptyString( params.delimiter ) ) {
        apiUrl = apiUrl + separatorChar + 'delimiter=' + params.delimiter;
        separatorChar = '&';
    }
    if ( isNonEmptyString( params.extraQueryParameters ) ) {
        apiUrl = apiUrl + separatorChar + params.extraQueryParameters;
        separatorChar = '&';
    }
    var headers = this.getHeaders('GET');
    headers['X-Passthrough-Type'] = 'download';
    if ( isNonEmptyString( params.downloadFolder ) ) {
        headers['X-Passthrough-Download-Folder'] = params.downloadFolder;
    }

    $.ajax({ url: apiUrl,  method: 'POST', headers: headers,
        success: function(data, textStatus, jqHXR) {
            handleData( data, callback );
        },
        error: function(jqHXR, textStatus, errorThrown) {
            handleError( callback, jqHXR, errorThrown, textStatus );
        },
    });
};

EcsS3.prototype.getServiceInformation = function( callback ) {
    var apiUrl = this.getSystemApiUrl() + '?endpoint';
    var headers = this.getHeaders('GET');
    function wrappedCallback( error, data ) {
        callback( data );
    };

    $.ajax({ url: apiUrl,  method: 'POST', headers: headers,
        success: function(data, textStatus, jqHXR) {
            handleData( data, wrappedCallback, makeEcsServiceInformation );
        },
        error: function(jqHXR, textStatus, errorThrown) {
            handleError( wrappedCallback,  jqHXR, errorThrown, textStatus );
        },
    });
};

function makeEcsServiceInformation( data ) {
    return {
        successful: true,
        metadata: true,
        namespace: false,
        object: true,
        versioning: true,
        version: data.body.versionInfo
    };
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
    return window.location.protocol + '//' + window.location.host + '/service/proxy';
};

EcsS3.prototype.getBucketApiUrl = function( entry ) {
    return combineWithDelimiter( this.getSystemApiUrl(), entry.bucket );
};

EcsS3.prototype.getObjectApiUrl = function( entry ) {
    return combineWithDelimiter( this.getBucketApiUrl( entry ), entry.key );
};

EcsS3.prototype.getObjectOrVersionApiUrl = function( entry ) {
    var url = combineWithDelimiter( combineWithDelimiter( this.getSystemApiUrl(), entry.bucket ), entry.key );
    if ( entry.versionId ) {
        url = url + '?versionId=' + entry.versionId;
    }
    return url;
};

EcsS3.prototype.getCopySource = function( entry ) {
    var copySource = combineWithDelimiter( combineWithDelimiter( '', entry.bucket ), entry.key );
    if ( entry.versionId ) {
        copySource = copySource + '?versionId=' + entry.versionId;
    }
    return copySource;
};

