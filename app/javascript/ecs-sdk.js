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
}

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

function handleData( data, callback ) {
  if (( data.code >= 200 ) && ( data.code < 300 )) {
    callback( null, data );
  } else {
    callback( { statusCode: data.code, errorThrown: "failure" }, null );
  }
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
    $.ajax({ url: apiUrl,  method: 'POST', headers: headers,
        success: function(data, textStatus, jqHXR) {
            callback( null, data );
        },
        error: function(jqHXR, textStatus, errorThrown) {
            callback( { statusCode: jqHXR.statusCode, errorThrown: errorThrown }, null );
        },
    });
};

EcsS3.prototype.headObject = function( objectParams, callback ) {
    var apiUrl = this.getObjectApiUrl(objectParams);
    var headers = this.getHeaders('HEAD');
    $.ajax({ url: apiUrl,  method: 'POST', headers: headers,
        success: function(data, textStatus, jqHXR) {
            data.ContentLength = data.response_headers['Content-Length'];
            data.LastModified = data.response_headers['Last-Modified'];
            data.type = FileRow.ENTRY_TYPE.REGULAR;
            callback( null, data );
        },
        error: function(jqHXR, textStatus, errorThrown) {
            callback( { statusCode: jqHXR.statusCode, errorThrown: errorThrown }, null );
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
            callback( null, data );
        },
        error: function(jqHXR, textStatus, errorThrown) {
            callback( { statusCode: jqHXR.statusCode, errorThrown: errorThrown }, null );
        },
    });
};

EcsS3.prototype.listBuckets = function(callback ) {
    var apiUrl = this.getSystemApiUrl();
    var headers = this.getHeaders('GET');
    
    $.ajax({ url: apiUrl,  method: 'POST', headers: headers,
        success: function(data, textStatus, jqHXR) {
            callback( null, data );
        },
        error: function(jqHXR, textStatus, errorThrown) {
            callback( { statusCode: jqHXR.statusCode, errorThrown: errorThrown }, null );
        },
    });

};

EcsS3.prototype.getBucketAcl = function( bucketParams, callback ) {
    var apiUrl = this.getBucketApiUrl(bucketParams); + '?acl';
    var headers = this.getHeaders('GET');
    
    $.ajax({ url: apiUrl,  method: 'POST', headers: headers,
        success: function(data, textStatus, jqHXR) {
            callback( null, data );
        },
        error: function(jqHXR, textStatus, errorThrown) {
            callback( { statusCode: jqHXR.statusCode, errorThrown: errorThrown }, null );
        },
    });
};

EcsS3.prototype.getObjectAcl = function( objectParams, callback ) {
    var apiUrl = this.getObjectApiUrl(objectParams) + '?acl';
    var headers = this.getHeaders('GET');
    
    $.ajax({ url: apiUrl,  method: 'POST', headers: headers,
        success: function(data, textStatus, jqHXR) {
            callback( null, data );
        },
        error: function(jqHXR, textStatus, errorThrown) {
            callback( { statusCode: jqHXR.statusCode, errorThrown: errorThrown }, null );
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
            callback( null, data );
        },
        error: function(jqHXR, textStatus, errorThrown) {
            callback( { statusCode: jqHXR.statusCode, errorThrown: errorThrown }, null );
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
            callback( { statusCode: jqHXR.statusCode, errorThrown: errorThrown }, null );
        },
    });
};

EcsS3.prototype.getHeaders = function( passthroughMethod ) {
    var headers = {
        'X-Passthrough-Endpoint': this.endpoint,
        'X-Passthrough-Key': this.accessKeyId,
        'X-Passthrough-Secret': this.secretAccessKey,
        'X-Passthrough-Method': passthroughMethod,
        'Accept': 'application/json'
    };
    return headers;
};

EcsS3.prototype.getSystemApiUrl = function() {
    return 'http://localhost/api/v2/s3/';
};

EcsS3.prototype.getBucketApiUrl = function( params ) {
    return combineWithSlash( this.getSystemApiUrl(), params.Bucket );
};

EcsS3.prototype.getObjectApiUrl = function( params ) {
    return combineWithSlash( this.getBucketApiUrl( params ), params.Key );
};

