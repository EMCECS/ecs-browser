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
EcsS3 = function( s3Params ) {
    this.endpoint = s3Params.endpoint;
    this.accessKeyId = s3Params.accessKeyId;
    this.secretAccessKey = s3Params.secretAccessKey;
    this.sslEnabled = s3Params.sslEnabled;
    this.s3ForcePathStyle = s3Params.s3ForcePathStyle;
    this.configuration = s3Params;
};

EcsS3.prototype.headBucket = function( bucketParams, callback ) {
    var apiUrl = 'http://localhost/api/v2/s3/' + bucketParams.Bucket;
    var headers = {
        'X-Passthrough-Endpoint': this.endpoint,
        'X-Passthrough-Key': this.accessKeyId,
        'X-Passthrough-Secret': this.secretAccessKey,
        'X-Passthrough-Method': 'HEAD',
        'Accept': 'application/json'
    };
    
    $.ajax({ url: apiUrl,  method: 'POST', headers: headers,
        success: function(data, textStatus, jqHXR) {
            callback( null, data );
        },
        error: function(jqHXR, textStatus, errorThrown) {
            callback( { statusCode: jqHXR.statusCode, errorThrown: errorThrown }, null );
        },
    });
};

EcsS3.prototype.listObjects = function( bucketParams, callback ) {
    var apiUrl = 'http://localhost/api/v2/s3/' + bucketParams.Bucket;
    var headers = {
        'X-Passthrough-Endpoint': this.endpoint,
        'X-Passthrough-Key': this.accessKeyId,
        'X-Passthrough-Secret': this.secretAccessKey,
        'X-Passthrough-Method': 'GET',
        'Accept': 'application/json'
    };
    
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
    var apiUrl = 'http://localhost/api/v2/s3/';
    var headers = {
        'X-Passthrough-Endpoint': this.endpoint,
        'X-Passthrough-Key': this.accessKeyId,
        'X-Passthrough-Secret': this.secretAccessKey,
        'X-Passthrough-Method': 'GET',
        'Accept': 'application/json'
    };
    
    $.ajax({ url: apiUrl,  method: 'POST', headers: headers,
        success: function(data, textStatus, jqHXR) {
            callback( null, data );
        },
        error: function(jqHXR, textStatus, errorThrown) {
            callback( { statusCode: jqHXR.statusCode, errorThrown: errorThrown }, null );
        },
    });
};
