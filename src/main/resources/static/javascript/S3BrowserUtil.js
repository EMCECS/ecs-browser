/*
 * Copyright (c) 2011-2017, EMC Corporation. All rights reserved.
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
S3BrowserUtil = function(uid, secret, endpoint, templateEngine, $statusMessage) {
    this.templates = templateEngine;
    this.useHierarchicalMode = true;
    this.$statusMessage = $statusMessage;
    this.setCredentials(uid, secret, endpoint);
};

// hackery to support IE <9. jQuery's bind will break remove() for any elements with associated events, so we can't use that either.
S3BrowserUtil.bind = function(element, eventName, eventFunction) {
    element['on' + eventName] = function(event) {
        if (!event)
            event = window.event;
        if (!event.stopPropagation)
            event.stopPropagation = function() {
                event.cancelBubble = true;
            };
        if (!event.preventDefault)
            event.preventDefault = function() {
                event.returnValue = false;
            };
        if (!event.pageX && event.x)
            event.pageX = event.x
            + (document.body.scrollLeft || document.documentElement.scrollLeft);
        if (!event.pageY && event.y)
            event.pageY = event.y
            + (document.body.scrollTop || document.documentElement.scrollTop);
        if (!event.which && event.button) { // translate IE's mouse button
            event.which = (event.button < 2) ? 1 : (event.button == 4) ? 2 : 3; // 1 => 1, 4 => 2, * => 3
        }
        if (!event.target)
            event.target = event.srcElement;
            eventFunction(event);
    };
};

S3BrowserUtil.dumpObject = function(object, maxLevel) {
    if (typeof (maxLevel) == 'undefined')
    maxLevel = 1;
    if (maxLevel < 0)
    return object; // we've reached our max depth
    var output = "[";
    for ( var property in object) {
        if (!object.hasOwnProperty(property))
        continue;
        var value = object[property];
        if (typeof (value) === 'object' && value != null)
        value = S3BrowserUtil.dumpObject(value, maxLevel - 1);
        output += property + "=" + value + ", ";
    }
    if (output.length > 1)
    output = output.substr(0, output.length - 2);
    output += "]";
    return output;
};

S3BrowserUtil.prototype.setCredentials = function(uid, secret, endpoint) {
    this.s3 = new EcsS3({
        endpoint : endpoint,
        accessKeyId : uid,
        secretAccessKey : secret,
        s3ForcePathStyle : true
    });
};

S3BrowserUtil.prototype.debug = function(message) {
    if (typeof (console) !== 'undefined') {
        if (typeof (console.debug) !== 'undefined') {
            console.debug(message);
        } else if (typeof (console.log) !== 'undefined') {
            console.log(message);
        }
    }
};

S3BrowserUtil.prototype.prompt = function(templateName, model, validatorFunction, validationFailedTemplateName, initialValue) {
    var promptString = this.templates.get(templateName).render(model);
    var failureTemplate = this.templates.get(validationFailedTemplateName);
    var value = prompt(promptString, initialValue || '');
    while (value != null && value.length > 0 && !validatorFunction(value)) {
        alert(failureTemplate.render({
            value : value
        }));
        value = prompt(promptString, value);
    }
    if (value == null || value.length == 0) {
        return null;
    } else {
        return value;
    }
};

S3BrowserUtil.prototype.getS3Info = function(callback) {
    var util = this;
    util.s3.getServiceInformation(function(result) {
        if (result.successful) {
            callback(result)
        }else{
            util.s3Error(result);
        }
    });
};

S3BrowserUtil.prototype.getLocationText = function( currentEntry ) {
    var locationText = '/';
    if ( currentEntry ) {
        if ( currentEntry.bucket ) {
            locationText = locationText + currentEntry.bucket + '/';
        }
        if ( this.useHierarchicalMode && currentEntry.key ) {
            locationText = locationText + currentEntry.key;
        }
    }
    return locationText;
};

S3BrowserUtil.prototype.getCurrentEntry = function( locationText ) {
    var bucket;
    var key;
    var name;
    var type;
    if ( locationText ) {
        var locationChunks = locationText.split('/');
        if ( locationChunks ) {
            for ( var i = 0; i < locationChunks.length; ++i ) {
                var locationChunk = locationChunks[i];
                if ( locationChunk ) {
                    if ( !bucket ) {
                        bucket = locationChunk;
                        name = locationChunk;
                        type = FileRow.ENTRY_TYPE.BUCKET;
                        if ( !this.useHierarchicalMode ) {
                            // No directories, so we are done once we have found the bucket
                            break;
                        }
                    } else {
                        name = locationChunk + '/';
                        if ( !key ) {
                            key = name;
                        } else {
                            key = key + name;
                        }
                        type = FileRow.ENTRY_TYPE.DIRECTORY;
                    }
                }
            }
        }
    }
    return {
        bucket: bucket,
        key: key,
        name: name,
        type: type
    };
};

S3BrowserUtil.prototype.getParentEntry = function( entry ) {
    var bucket;
    var key;
    var name;
    var type;
    if ( entry.key ) {
        bucket = entry.bucket;
        name = bucket;
        type = FileRow.ENTRY_TYPE.BUCKET;
        if ( this.useHierarchicalMode ) {
            var keyChunks = entry.key.split('/');
            if ( keyChunks ) {
                var lastNonEmptyChunkIndex;
                for ( lastNonEmptyChunkIndex = keyChunks.length - 1; lastNonEmptyChunkIndex >= 0; --lastNonEmptyChunkIndex ) {
                    if ( keyChunks[lastNonEmptyChunkIndex] ) {
                        break;
                    }
                }
                for ( var i = 0; i < lastNonEmptyChunkIndex; ++i ) {
                    var keyChunk = keyChunks[i];
                    if ( keyChunk ) {
                        name = keyChunk + '/';
                        if ( !key ) {
                            key = name;
                        } else {
                            key = key + name;
                        }
                        type = FileRow.ENTRY_TYPE.DIRECTORY;
                    }
                }
            }
        }
    }
    return {
        bucket: bucket,
        key: key,
        name: name,
        type: type
    };
};

S3BrowserUtil.prototype.getChildEntry = function( entry, partialChildEntry ) {
    var bucket;
    var key;
    var name = partialChildEntry.name;
    var type;
    if ( !entry.type ) {
        bucket = name;
        type = FileRow.ENTRY_TYPE.BUCKET;
    } else {
        bucket = entry.bucket;
        type = partialChildEntry.type;
        if ( !this.useHierarchicalMode ) {
            key = name;
        } else {
            key = (!entry.key) ? name : entry.key + name;
            if ( type == FileRow.ENTRY_TYPE.DIRECTORY ) {
                key = this.endWithSlash( key );
            }
        }
    }
    return {
        bucket: bucket,
        key: key,
        name: name,
        type: type
    };
};

S3BrowserUtil.prototype.getNameFromKey = function( key ) {
    var name = this.useHierarchicalMode ? '' : key;
    if ( this.useHierarchicalMode ) {
        var keyChunks = key.split('/');
        for ( var i = keyChunks.length - 1; i >= 0; --i ) {
            name = keyChunks[i];
            if ( name ) {
                break;
            }
        }
    }
    return name;
};

S3BrowserUtil.prototype.createBucketOrDirectory = function( entry, functionUpdateGui, functionAddProperties) {
    var util = this;
    util.showStatus('Creating bucket or directory...');
    var createObjectCallback = function( headers ) {
        util.createObject( entry, null, null, null, headers,
            function( result ) {
                util.hideStatus('Creating bucket or directory...');
                if ( result ) {
                    functionUpdateGui();
                }
            }
        );
    }
    functionAddProperties( createObjectCallback );
};

S3BrowserUtil.prototype.showStatus = function(message) {
    if (this.$statusMessage) {
        this.$statusMessage.text(message);
        this.$statusMessage.fadeIn(100);
        if (!this.statusMessageQueue)
        this.statusMessageQueue = {};
        var count = this.statusMessageQueue[message] || 0;
        this.statusMessageQueue[message] = count + 1;
    }
};

S3BrowserUtil.prototype.hideStatus = function(message) {
    if (this.$statusMessage) {
        this.statusMessageQueue[message] = this.statusMessageQueue[message] - 1;
        var messages = Object.keys(this.statusMessageQueue);
        for (var i = 0; i < messages.length; i++) {
            if (this.statusMessageQueue[messages[i]] > 0) {
                this.$statusMessage.text(messages[i]);
                return;
            }
        }
        this.$statusMessage.fadeOut(100);
    }
};

S3BrowserUtil.prototype.error = function(message) {
    alert(message);
};

S3BrowserUtil.prototype.s3Error = function(result) {
    this.debug(S3BrowserUtil.dumpObject(result));
    try {
        this.error(this.templates.get(
            's3Error.' + (result.errorCode || result.httpCode)).render({
                message : (result.errorMessage || result.httpMessage)
            }));
    } catch (error) {
        this.error(result.errorMessage || result.httpMessage); // if we don't have a template for the error, use the plain message
    }
};

S3BrowserUtil.prototype.futureDate = function(howMany, ofWhat) {
    try {
        howMany = parseInt(howMany);
    } catch (error) {
        this.error(this.templates.get('invalidNumberError').render({
            value : howMany
        }));
        return null;
    }
    var date = new Date();
    var currentNumber = {
        hours : date.getHours(),
        days : date.getDate(),
        months : date.getMonth(),
        years : date.getFullYear()
    }[ofWhat.toLowerCase()];
    var func = {
        hours : date.setHours,
        days : date.setDate,
        months : date.setMonth,
        years : date.setFullYear
    }[ofWhat.toLowerCase()];
    func.call(date, currentNumber + howMany);
    return date;
};

S3BrowserUtil.prototype.validTag = function(tag) {
    // cannot be null or empty, cannot start or end with a slash
    return tag && ( tag.trim().length != 0 ) && this.validMetadataName( tag );
};

S3BrowserUtil.prototype.validMetadataName = function(name) {
    // cannot start or end with a slash
    return !( /^\//.test( name ) || /\/$/.test( name ) );
};

S3BrowserUtil.prototype.validPath = function(path) {
    // cannot be null or empty, must start with a slash
    return !(!path || path.trim().length == 0 || !/^\//.test(path));
};

S3BrowserUtil.prototype.validName = function(name) {
    // cannot be null or empty, cannot contain /
    var nameSplit=name.split('/');
    name=nameSplit[nameSplit.length-1];
    return !(!name || name.trim().length == 0 || /[/]/.test(name));
};

S3BrowserUtil.prototype.endWithSlash = function(path) {
    path = path.trim();
    if (path.charAt(path.length - 1) !== '/')
        path += '/';
    return path;
};

S3BrowserUtil.prototype.noSlashes = function(path) {
    if (!path || path.length == 0)
        return path;
    if (path.charAt(0) == '/')
        path = path.substr(1);
    if (path.charAt(path.length - 1) == '/')
        path = path.substr(0, path.length - 1);
    return path;
};

S3BrowserUtil.prototype.isListable = function(entryType) {
    return this.isDirectory(entryType) || this.isBucket(entryType);
};

S3BrowserUtil.prototype.isDirectory = function(entryType) {
    return entryType == FileRow.ENTRY_TYPE.DIRECTORY;
};

S3BrowserUtil.prototype.isBucket = function(entryType) {
    return entryType == FileRow.ENTRY_TYPE.BUCKET;
};

ListOptions=function(a,b,c,d,e){this.limit=a;this.token=b;this.includeMeta=c;this.userMetaTags=d;this.systemMetaTags=e};

S3BrowserUtil.prototype.list = function(entry, includeMetadata, callback, extraQueryParameters) {
    var win = window;
    var util = this;
    var options = new ListOptions(0, null, true, null, null);
    var isMetadataList = extraQueryParameters && ( extraQueryParameters.indexOf( 'query=' ) >= 0 );
    var entries = [];
    this.showStatus('Listing directory...');
    // List buckets
    if ( !entry.type ) {
        util.s3.listBuckets(function(err, result) {
            util.hideStatus('Listing directory...');
            if (!err) {
                var buckets = result.buckets;
                for (var i = 0; i < buckets.length; i++) {
                    var bucket = buckets[i];
                    var entry = {
                        name : bucket.name,
                        systemMeta : bucket,
                        type : FileRow.ENTRY_TYPE.BUCKET,
                        bucket: bucket.name
                    };
                    if (bucket.creationDate) {
                        bucket.creationDate = new Date(+bucket.creationDate);
                    }
                    entry.systemMeta.lastModified = bucket.creationDate;
                    entries.push(entry);
                }
                callback( entries );
            } else {
                alert( util.templates.get('errorMessage').render( err ) );
                util.s3Error(result);
                callback(null);
            }
        });
    } else {
        var parameters = {
            entry: entry,
            extraQueryParameters: extraQueryParameters
        };
        if ( this.useHierarchicalMode ) {
            parameters.delimiter = '/';
        }
        util.s3.listObjects(parameters, function(err, data) {
            util.hideStatus('Listing directory...');
            if (!err) {
                var folders = data.commonPrefixes;
                var files = data.objects;
                var entries = [];
                if (folders) {
                    for (var i = 0; i < folders.length; i++) {
                        var folder = folders[i];
                        if (folder != '/') {
                            var entry = {
                                bucket: data.bucketName,
                                key: folder,
                                name : util.endWithSlash( util.getNameFromKey( folder ) ),
                                type : FileRow.ENTRY_TYPE.DIRECTORY
                            };
                            entries.push(entry);
                        }
                    }
                }
                if (files) {
                    for ( var i = 0; i < files.length; i++ ) {
                        var file = files[i];
                        if ( isMetadataList ) {
                            entryKey = file.objectName;
                            entrySystemMeta = file.queryMds[0].mdMap;
                            if ( !entrySystemMeta.lastModified ) {
                                entrySystemMeta.lastModified = new Date(+entrySystemMeta.createtime);
                            }
                        } else {
                            entryKey = file.key;
                            entrySystemMeta = file;
                            entrySystemMeta.lastModified = new Date(+entrySystemMeta.lastModified);
                        }
                        if ( entryKey != parameters.entry.key ) {
                            var entry = {
                                bucket: data.bucketName,
                                key: entryKey,
                                name : util.getNameFromKey(entryKey),
                                systemMeta : entrySystemMeta,
                                type : FileRow.ENTRY_TYPE.REGULAR,
                            };
                            entries.push(entry);
                        }
                    }
                }
                callback( entries );
            } else {
                alert( util.templates.get('errorMessage').render( err ) );
                util.s3Error(result);
                callback(null);
            }
        });
    }
};

S3BrowserUtil.prototype.getAcl = function( entry, callback ) {
    var util = this;
    this.showStatus('Retrieving ACL...');
    util.s3.getAcl( entry, function( error, data ) {
        if ( error != null ) {
            alert( util.templates.get('errorMessage').render( error ) );
            util.s3Error(error);
        } else {
            util.hideStatus('Retrieving ACL...');
            callback(data);
        }
    });
};

S3BrowserUtil.prototype.setAcl = function(entry, acp, callback) {
    console.trace();
    var util = this;
    this.showStatus('Setting ACL...');
    var grants = [];
    for ( var i = 0; i < acp.grants.length; i++ ){
        var grant = acp.grants[i];
        if ( grant.permission != "NONE" ) {
            grants.push( grant );
        }
    }
    var accessControlPolicy = { grants: grants, owner: { id: acp.owner.id } };
    var params = { entry: entry, accessControlPolicy: accessControlPolicy };
    this.s3.putAcl( params, function( err, result ) {
        util.hideStatus('Setting ACL...');
        if ( err != null ) {
            if ( err.status == 403 ){
                alert(util.templates.get('bucketCors').render({bucketName:bucketName}));
            } else {
                alert(util.templates.get('errorMessage').render( err ));
            }
            callback();
        } else {
            callback(true);
        }
    });
};

S3BrowserUtil.prototype.getVersioning = function( entry, callback ) {
    if( location == "/" ) {
        var util = this;
        this.showStatus('Retrieving Versioning...');
        util.s3.getBucketVersioning( entry, function( err, data ) {
            util.hideStatus('Retrieving Versioning...');
            if( err != null ){
                util.s3Error( err );
            } else {
                callback( data );
            }
        });
    }
};

S3BrowserUtil.prototype.setVersioning = function( entry, versioning, callback ) {
    console.trace();
    var util = this;
    this.showStatus('Setting Versioning...');
    var params = { bucket: entry.bucket, key: entry.key, versioning: versioning };
    this.s3.putBucketVersioning( params, function( err, result ) {
        util.hideStatus('Setting Versioning...');
        if ( err != null ) {
            if ( err.status == 403 ){
                alert(util.templates.get('bucketCors').render({bucketName:bucketName}));
            } else {
                alert(util.templates.get('errorMessage').render( err ));
            }
            callback();
        } else {
            callback( true );
        }
    });
};

S3BrowserUtil.prototype.getSystemMetadata = function( entry, callback ) {
    var util = this;
    this.showStatus('Retrieving system metadata...');
    util.s3.headAnything( entry, function( err, data ) {
        util.hideStatus('Retrieving system metadata...');
        if(err != null){
            if ( err.status == 404 ) {
                callback( null );
            } else {
                alert(util.templates.get('errorMessage').render( err ));
                util.s3Error( result );
            }
        } else {
            callback( data );
        }
    });
};

S3BrowserUtil.prototype.getUserMetadata = function( entry, callback ) {
    var util = this;
    util.showStatus('Retrieving system metadata...');
    util.s3.headAnything( entry, function(err,data) {
        util.hideStatus('Retrieving system metadata...');
        if ( err != null ) {
            alert( util.templates.get('errorMessage').render( err ) );
            util.s3Error(err);
        } else {
            if( data.Metadata ) {
                entry.userMeta = data.Metadata;
            }
            callback( data );
        }
    });
};

S3BrowserUtil.prototype.setUserMetadata = function(entry, userMeta, callback) {
    var util = this;
    this.showStatus('Saving metadata...');
    var params={
        entry: entry,
        entryToCopy: entry,
        metadata: userMeta,
        metadataDirective: "REPLACE"
    };
    this.s3.copyObject( params, function( err, data ) {
        util.hideStatus('Saving metadata...');
        if (err != null) {
            if ( err.status == 403 ) {
                alert(util.templates.get('bucketCors').render({bucketName:bucketName}));
            } else {
                alert(util.templates.get('errorMessage').render( err ));
            }
            callback();
        } else {
            callback(true);
        }
    });
};

S3BrowserUtil.prototype.createObject = function(entry, form, data, mimeType, headers, callback) {
    var util = this;
    this.showStatus('Creating object...');
    var params = { entry: entry, body: data, headers: headers };
    this.s3.putObject( params, function( err, data ) {
        util.hideStatus('Creating object...');
        var success;
        if ( err != null ) {
            success = false;
            if ( err.status == 403 ) {
                alert(util.templates.get('bucketCors').render({bucketName:bucketName}));
            } else {
                alert(util.templates.get('errorMessage').render( err ));
            }
        } else {
            success = true;
            console.log("DATA: " + data);
        }
        callback( success );
    } );
};

S3BrowserUtil.prototype.overwriteObject = function(entry, form, data, mimeType, headers, callback) {
    var util = this;
    this.showStatus('Overwriting object...');
    this.s3.updateObject(entry, null, null, null, form, data, null, mimeType,
        function(result) {
            util.hideStatus('Overwriting object...');
            if (result.successful) {
                callback(true);
            }else{
                alert(util.templates.get('errorMessage').render( err ));
                util.s3Error(result);
                callback(false);
            }
        }
    );
};

S3BrowserUtil.prototype.moveObject = function( newEntry, existingEntry, callback ) {
    var util = this;
    if ( ( newEntry.bucket == existingEntry.bucket )
      && ( newEntry.key == existingEntry.key )
      && ( newEntry.versionId == existingEntry.versionId ) ) {
        alert("Source and target are the same file");
        return;
    }

    var moveObject = function() {
        util.showStatus('Copying object...');
        var params= {
            entry: newEntry,
            entryToCopy: existingEntry
        };
        util.s3.copyObject( params, function( err, data ){
            util.hideStatus('Copying object...');
            if ( err != null ) {
                alert( util.templates.get('errorMessage').render( err ) );
                console.log( err );
            } else {
                util.showStatus('Deleting old object...');
                util.s3.deleteObject( existingEntry, function( err, data ){
                    util.hideStatus('Deleting old object...');
                    if ( err != null ) {
                        if ( err.status==403 ) {
                            alert( util.templates.get('bucketCors').render( { bucketName: existingEntry.bucket } ) );
                        } else {
                            alert( util.templates.get('errorMessage').render( err ) );
                        }
                        console.log( err );
                    } else {
                        callback();
                    }
                });
            }
        });
    };

    var existsCallback = function() {
        var overwrite = confirm( util.templates.get('itemExistsPrompt').render( {
            name : newEntry.key + ' in bucket ' + newEntry.bucket
        } ) );
        if ( overwrite ) {
            moveObject();
        }
    };

    var notExistsCallback = moveObject;

    util.ifExists( newEntry, existsCallback, notExistsCallback );
};

S3BrowserUtil.prototype.deleteObject = function(entry, callback) {
    var util = this;
    this.showStatus('Deleting object...');
    util.s3.deleteObject( entry, function( err, data ) {
        util.hideStatus('Deleting object...');
        if(err!=null){
            if(err.status==403){
                alert(util.templates.get('bucketCors').render({bucketName: entry.bucket}));
            }else{
                alert(util.templates.get('errorMessage').render( err ));
            }
            //util.s3Error(err);
        }else{
            callback();
        }
    });
};

S3BrowserUtil.prototype.listVersions = function( entry, callback ) {
    var util = this;
    this.showStatus('Listing versions...');
    util.s3.listObjectVersions( entry, function( err, data ) {
        util.showStatus('Listing versions...');
        if( err != null ) {
            if ( err.status == 403 ) {
                alert( util.templates.get('bucketCors').render( { bucketName: entry.bucket } ) );
            } else {
                alert( util.templates.get('errorMessage').render( err ) );
            }
            //util.s3Error(err);
        } else {
            callback( data.versions );
        }
    });
};

S3BrowserUtil.prototype.restoreVersion = function( versionEntry, callback ) {
    var util = this;
    this.showStatus('Restoring version...');
    this.s3.restoreVersion( versionEntry, function( error, data ) {
        util.hideStatus('Restoring version...');
        if ( error == null ) {
            callback( data );
        } else {
            util.s3Error( error );
        }
    });
};

S3BrowserUtil.prototype.deleteVersion = function( versionEntry, callback ) {
    var util = this;
    this.showStatus('Deleting version...');
    this.s3.deleteVersion( versionEntry, function( error, data ) {
        util.hideStatus('Deleting version...');
        if ( error == null ) {
            callback( data );
        } else {
            util.s3Error( error );
        }
    });
};

S3BrowserUtil.prototype.getShareableUrl = function( entry, date, callback ) {
    console.trace();
    var expires = Math.floor( date.getTime() / 1000 );
    var params = { entry: entry, expires: date.getTime(), method: 'GET' };
    var util = this;
    return this.s3.getPresignedUrl( params, function( error, data ) {
        if ( error != null ) {
            alert( util.templates.get('errorMessage').render( { status:error.status, message:error.message } ) );
        } else {
            callback( data );
        }
    });
};

S3BrowserUtil.prototype.createAttachmentDisposition=function(fileName){
    if ( fileName ) return "attachment; filename*=" + encodeURIComponent( "UTF-8''" + fileName );
    else return "attachment";
}

S3BrowserUtil.prototype.getFileName = function( key ) {
    var pattern = /\/[^/]*$/;
    var name = pattern.exec( key );
    if ( name ) {
        if (name[0].length) {
            name = name[0];
        }
        return name.substr(1);
    }
    return key;
};

S3BrowserUtil.prototype.addKey = function( keys, newKey, newType ) {
  if ( newKey ) {
    if ( keys ) {
      keys = keys + ',';
    } else {
      keys = '';
    }
    keys = keys + newKey;
    if ( newType ) {
      keys = keys + ';' + newType;
    }
  }
  return keys;
};

S3BrowserUtil.prototype.downloadFile = function( entry ) {
    console.trace();
    var iframe = $('iframe#s3Iframe');
    if (iframe.length == 0) {
        iframe = $('<iframe id="s3Iframe" style="display: none;" />');
        $('body').append(iframe);
    }
    this.getShareableUrl( entry, this.futureDate(1, 'hours'), function( data ) {
        iframe.prop( 'src', data );
    });
};

S3BrowserUtil.prototype.ifExists = function( entry, existsCallback, notExistsCallback, errorCallback ) {
    var util = this;
    this.showStatus('Checking existence...');
    util.s3.headAnything( entry, function( error, data ) {
        util.hideStatus('Checking existence...');
        if ( !error ) {
            existsCallback();
        } else if ( error.status == 404 ) {
            notExistsCallback();
        } else if ( errorCallback ) {
            errorCallback( error );
        }
    });
};

S3BrowserUtil.prototype.sort = function($table, subSelector, inverse) {
    // save sort state
    if (!this.sortMap)
    this.sortMap = {};
    if (typeof (inverse) == 'undefined') {
        inverse = !this.sortMap[subSelector];
    }
    this.sortMap[subSelector] = inverse;
    $table.find('.row').sortElements(function(a, b) {
        var $a = jQuery(a).find(subSelector), $b = jQuery(b).find(subSelector);
        var valA = $a.data('rawValue') || $a.text();
        valA = valA.toLowerCase();
        var valB = $b.data('rawValue') || $b.text();
        valB = valB.toLowerCase();
        if (valA.length == 0 && valB.length > 0)
        return inverse ? 1 : -1;
        else if (valA.length > 0 && valB.length == 0)
        return inverse ? -1 : 1;
        if (!isNaN(valA) && !isNaN(valB)) {
            valA = parseFloat(valA);
            valB = parseFloat(valB);
        }
        return valA > valB ? inverse ? -1 : 1 : inverse ? 1 : -1;
    });
};
