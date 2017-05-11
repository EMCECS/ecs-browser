/*

Copyright (c) 2011-2013, EMC Corporation

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
    if (value == null || value.length == 0)
    return null;
    return value;
};

S3BrowserUtil.prototype.getS3Info = function(callback) {
    var util = this;
    util.s3.getServiceInformation(function(result) {
        if (result.successful) {
            util.updateServiceInfo(result.value);
            callback(result.value)
        }else{
            util.s3Error(result);
        }
    });
};

S3BrowserUtil.prototype.updateServiceInfo = function(serviceInfo) {
    this.s3.s3Config.utf8Support = serviceInfo.utf8;
};

S3BrowserUtil.prototype.createDirectory = function(parentDirectory, callback) {
    var name = this.prompt('newDirectoryNamePrompt', {}, this.validName,
    'validNameError');
    if (name == null || name.length == 0)
        return;
    var path = this.endWithSlash(parentDirectory + name);
    var util = this;
    this.showStatus('Checking for existing object...');
    util.getSystemMetadata(path, function(result) {
        util.hideStatus('Checking for existing object...');
        if (result) {
            alert(util.templates.get('itemExistsError').render({
                name : path
            }));
            return;
        }
        util.showStatus('Creating directory...');
        util.createObject(name + "/", null, null, null,
            function(result) {
                util.hideStatus('Creating directory...');
                if (result) {
                    callback(name);
                }else{
                    util.s3Error(result);
                    callback(null);
                }
            }, null, parentDirectory);
    });
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
    return !(!tag || tag.trim().length == 0 || /^\//.test(tag) || /\/$/
            .test(tag));
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

S3BrowserUtil.prototype.parentDirectory = function(path) {
    path = path.substr(0, path.length - 1); // remove last character in case it's a slash
    var lastSlashIndex = path.lastIndexOf('/');
    if (lastSlashIndex === 0)
    return '/';
    else
    return path.substr(0, lastSlashIndex);
};

S3BrowserUtil.prototype.list = function(path, includeMetadata, callback) {
    var win = window;
    var util = this;
    var options = new ListOptions(0, null, true, null, null);
    this.showStatus('Listing directory...');
    // Flat mode
    if (!this.useHierarchicalMode) {
        // List buckets
        if (path == '/') {
            var list_call = function(util, options, entries) {
                util.s3.listBuckets(function(err, result) {
                    util.hideStatus('Listing directory...');
                    if (!err) {
                        var buckets = result.body.Buckets;
                        for (var i = 0; i < buckets.length; i++) {
                            var values = buckets[i];
                            var entry = {
                                name : values.Name,
                                systemMeta : values,
                                type : "bucket",
                                id : path + values.Name,
                                prefixKey: path + values.Name,
                                bucket: bucketName
                            };
                            entries.push(entry);
                            callback(entries);
                        }
                    }else{
                        alert(util.templates.get('errorMessage').render({statusCode:err.statusCode,message:err.message}));
                        util.s3Error(result);
                        callback(null);
                    }
                });
            };
            list_call(util, options, []);
        // List objects
        }else{
            var newpath = path.substring(1, path.length);
            var splits = newpath.split("/");
            var bucketName = splits[0];
            var prefix = splits.splice(1, splits.length).join('/');
            var list_call = function(util, options, entries) {
                var par = {
                    Bucket : bucketName,
                };
                util.s3.listObjects(par, function(err, data) {
                    util.hideStatus('Listing directory...');
                    if (!err) {
                        var folders = data.body.CommonPrefixes;
                        var files = data.body.Contents;
                        var entries = [];
                        for (var i = 0; i < files.length; i++) {
                            var values = files[i];
                            var entry = {
                                name : values.Key,
                                systemMeta : values,
                                type : "regular",
                                id : values.Key,
                                prefixKey: values.Key,
                                bucket: bucketName
                            };
                            entries.push(entry);
                        }
                        callback(entries);
                    }else{
                        alert(util.templates.get('errorMessage').render({statusCode:err.statusCode,message:err.message}));
                        util.s3Error(result);
                        callback(null);
                    }
                });
            };
            list_call(util, options, []);
        }
    // Hierarchical mode
    }else{
        // List buckets
        if (path == '/') {
            var list_call = function(util, options, entries) {
                util.s3.listBuckets(function(err, result) {
                    util.hideStatus('Listing directory...');
                    if (!err) {
                        var buckets = result.body.Buckets;
                        for (var i = 0; i < buckets.length; i++) {
                            var values = buckets[i];
                            var entry = {
                                name : values.Name,
                                systemMeta : values,
                                type : "bucket",
                                id : path + values.Name,
                                prefixKey: path + values.Name,
                                bucket: bucketName
                            };
                            entries.push(entry);
                            callback(entries);
                        }
                    }else{
                        alert(util.templates.get('errorMessage').render({statusCode:err.statusCode,message:err.message}));
                        util.s3Error(result);
                        callback(null);
                    }
                });
            };
            list_call(util, options, []);
        // List objects
        }else{
            var newpath = path.substring(1, path.length);
            var splits = newpath.split("/");
            var bucketName = splits[0];
            var prefix = splits.splice(1, splits.length).join('/');
            var list_call = function(util, options, entries) {
                var par = {
                    Bucket : bucketName,
                    Delimiter : '/',
                    Prefix : prefix
                };
                util.s3.listObjects(par, function(err, data) {
                    util.hideStatus('Listing directory...');
                    if (!err) {
                        var folders = data.body.CommonPrefixes;
                        var files = data.body.Contents;
                        var entries = [];
                        if (folders) {
                            for (var i = 0; i < folders.length; i++) {
                                var values = folders[i];
                                if (values.Prefix != '/') {
                                    var folderName = values.Prefix;
                                    folderName = folderName.substring(0, folderName.length - 1);
                                    var folderVariable=folderName.split('/');
                                    folderName=folderVariable[folderVariable.length-1];
                                    var entry = {
                                        name : folderName,
                                        systemMeta : values,
                                        type : "directory",
                                        id : path + folderName,
                                        prefixKey: values.Prefix,
                                        bucket: bucketName
                                    };
                                    entries.push(entry);
                                }
                            }
                        }
                        if (files) {
                            for (var i = 0; i < files.length; i++) {
                                var values = files[i];
                                var fileName = values.Key;
                                var fileNameVariable=fileName.split('/');
                                fileName=fileNameVariable[fileNameVariable.length-1];
                                if(fileName != "") {
                                    var entry = {
                                        name : fileName,
                                        systemMeta : values,
                                        type : "regular",
                                        id : fileName,
                                        prefixKey: values.Key,
                                        bucket: bucketName
                                    };
                                    entries.push(entry);
                                }
                            }
                        }
                        callback(entries);
                    }else{
                        alert(util.templates.get('errorMessage').render({statusCode:err.statusCode,message:err.message}));
                        util.s3Error(result);
                        callback(null);
                    }
                });
            };
            list_call(util, options, []);
        }
    }
};

S3BrowserUtil.prototype.getAcl = function(id,location, callback) {
    var util = this;
    this.showStatus('Retrieving ACL...');
    if(location=="/"){
        var path=id.split("/");
        var bucketName=path[1];
        var params={Bucket:bucketName};
        util.s3.getBucketAcl(params,function(err,data){
            if(err != null){
                util.s3Error(err);
            }else{
                util.hideStatus('Retrieving ACL...');
                callback(data.body);
            }
        });
    } else{
        var path=location.split("/");
        var bucketName=path[1];
        var params={Bucket:bucketName,Key:id};
        util.s3.getObjectAcl(params,function(err,data){
            if(err != null){
                alert(util.templates.get('errorMessage').render({statusCode:err.statusCode,message:err.message}));
                util.s3Error(err);
            } else{
                util.hideStatus('Retrieving ACL...');
                callback(data.body);
            }
        });
    }
};

S3BrowserUtil.prototype.setAcl = function(id, acl, callback) {
    console.trace();
    var util = this;
    var currentLocation=S3Browser.getCurrentLocation();
    this.showStatus('Setting ACL...');
    var location=currentLocation;
    var path=location.split("/");
    var bucketName=path[1];
    var Grants=[];
    var owner=acl.Owner;
    var userEntries=acl.userEntries;
    for(var i=0;i<userEntries.length;i++){
        if(userEntries[i].value != "NONE") {
            var grantee={DisplayName:userEntries[i].key,ID:userEntries[i].key,Type: "CanonicalUser"};
            var newgrants={Grantee:grantee,Permission:userEntries[i].value};
            Grants.push(newgrants);
        }
    }
    var AccessControlPolicy={Grants:Grants,Owner:owner};
    var params={Bucket:bucketName,Key:id,AccessControlPolicy:AccessControlPolicy};
    this.s3.putObjectAcl(params, function(err,result) {
        util.hideStatus('Setting ACL...');
        if (err != null) {
            if(err.statusCode==403){
                alert(util.templates.get('bucketCors').render({bucketName:bucketName}));
            }else{
                alert(util.templates.get('errorMessage').render({statusCode:err.statusCode,message:err.message}));
            }
            callback();
        }else{
            callback(true);
        }
    });
};

S3BrowserUtil.prototype.getSystemMetadata = function(id, callback) {
    var util = this;
    var newpath = id.substring(1, id.length);
    var splits = newpath.split("/");
    var bucketName = splits[0];
    var key = splits.splice(1, splits.length).join('/');
    this.showStatus('Retrieving system metadata...');
    var params={Bucket:bucketName,Key:key};
    util.s3.headObject(params,function(err,data){
        util.hideStatus('Retrieving system metadata...');
        if(err != null){
            if(err.statusCode==404){
                callback(null);
            } else{
                alert(util.templates.get('errorMessage').render({statusCode:err.statusCode,message:err.message}));
                util.s3Error(result);
            }
        }else{
            callback(data);
        }
    });
};

S3BrowserUtil.prototype.getUserMetadata = function(entry,location, callback) {
    var util = this;
    var path=location.split("/");
    var bucketName=path[1];
    var params={Bucket:bucketName,Key:entry.prefixKey};
    util.s3.headObject(params,function(err,data){
        util.hideStatus('Retrieving system metadata...');
        if(err != null){
            alert(util.templates.get('errorMessage').render({statusCode:err.statusCode,message:err.message}));
            util.s3Error(err);
        }else{
            if(data.Metadata!=null){
                entry.userMeta=data.Metadata;
            }
            callback(data);
        }
    });
};

S3BrowserUtil.prototype.setUserMetadata = function(id, userMeta, callback) {
    var util = this;
    this.showStatus('Saving metadata...');
    var currentLocation=S3Browser.getCurrentLocation();
    var location=currentLocation;
    var path=location.split("/");
    var bucketName=path[1];
    var params={Bucket:bucketName,CopySource:bucketName+"/"+id,Key:id,Metadata:userMeta,MetadataDirective:"REPLACE"};
    this.s3.copyObject(params,function(err,data){
        util.hideStatus('Saving metadata...');
        if (err != null) {
            if(err.statusCode==403){
                alert(util.templates.get('bucketCors').render({bucketName:bucketName}));
            }else{
                alert(util.templates.get('errorMessage').render({statusCode:err.statusCode,message:err.message}));
            }
            callback();
        }else{
            callback(true);
        }
    });
};

//       browser.util.createObject( id, form, file, (file ? file.type : null), completeF, progressF, browser.currentLocation );
S3BrowserUtil.prototype.createObject = function(key, form, data, mimeType, completeCallback, progressCallback, currentLocation) {
    var util = this;
    this.showStatus('Creating object...');
    var newpath = currentLocation.substring(1, currentLocation.length);
    var splits = newpath.split("/");
    var bucketName = splits[0];
    var prefix = splits.splice(1, splits.length).join('/');
    var params={Bucket:bucketName,Key:prefix + key,Body:data};
    util.s3.putObject(params,function(err,data){
    if(err != null){
        if (err.statusCode==403) {
            alert(util.templates.get('bucketCors').render({bucketName:bucketName}));
        } else {
            alert(util.templates.get('errorMessage').render({statusCode:err.statusCode,message:err.message}));
        }
        completeCallback(false);
        util.hideStatus('Creating object...');
    } else {
        console.log("DATA: " + data);
        var status = {};
        status.loaded = 1;
        status.totalSize = 1;
        progressCallback( status );
        completeCallback(true);
        util.hideStatus('Creating object...');
    }
    }).on('httpUploadProgress',progressCallback);
};

S3BrowserUtil.prototype.overwriteObject = function(id, form, data, mimeType, completeCallback, progressCallback) {
    var util = this;
    this.showStatus('Overwriting object...');
    this.s3.updateObject(id, null, null, null, form, data, null, mimeType,
        function(result) {
            util.hideStatus('Overwriting object...');
            if (result.successful) {
                completeCallback(true);
            }else{
                alert(util.templates.get('errorMessage').render({statusCode:err.statusCode,message:err.message}));
                util.s3Error(result);
                completeCallback(false);
            }
        }, progressCallback);
};

S3BrowserUtil.prototype.moveObject=function(existingPath, newPath, callback) {
    var util = this;
    this.showStatus('Checking for existing object...');
    var overwrite = false;
    util.showStatus('Renaming object...');
    var updatedPath=newPath.split("/");
    var bucketName=updatedPath[1];
    var newPath1=updatedPath.splice(2, updatedPath.length).join('/');
    var params={Bucket:bucketName,Key:newPath1};
    console.trace();
    var file=util.s3.headObject(params,function(err,data) {
        util.hideStatus('Checking for existing object...');
        if(err != null){
            if(err.statusCode==404){
                var newParams={Bucket:bucketName,CopySource:existingPath,Key:newPath1};
                util.s3.copyObject(newParams,function(err,data){
                    if(err != null){
                        alert(util.templates.get('errorMessage').render({statusCode:err.statusCode,message:err.message}));
                        console.log(err);
                    } else{
                        var deletePath=existingPath.split("/");
                        var deleteBucketName=deletePath[0];
                        var detectPath=deletePath.splice(1, deletePath.length).join('/');
                        var deleteParams={Bucket:deleteBucketName,Key:detectPath};
                        util.s3.deleteObject(deleteParams,function(err,data){
                            if(err != null){
                                if(err.statusCode==403){
                                    alert(util.templates.get('bucketCors').render({bucketName:bucketName}));
                                }else{
                                    alert(util.templates.get('errorMessage').render({statusCode:err.statusCode,message:err.message}));
                                }
                                console.log(err);
                            }else{
                                util.hideStatus('Renaming object...');
                                callback();
                            }
                        });
                    }
                });
            } else{
                console.log(err);
            }
        } else{
            overwrite = confirm(util.templates.get('itemExistsPrompt').render({
                name : newPath
            }));
            if (!overwrite){
                util.hideStatus('Renaming object...');
                return;
            } else{
                util.hideStatus('Renaming object...');
                if(existingPath==newPath1){
                    alert("Source and target are the same file");
                } else{
                    var newParams={Bucket:bucketName,CopySource:existingPath,Key:newPath1};
                    util.s3.copyObject(newParams,function(err,data){
                        if(err != null) {
                            alert(util.templates.get('errorMessage').render({statusCode:err.statusCode,message:err.message}));
                            console.log(err);
                        }else{
                            var deletePath=existingPath.split("/");
                            var deleteBucketName=deletePath[0];
                            var detectPath=deletePath.splice(1, deletePath.length).join('/');
                            var deleteParams={Bucket:deleteBucketName,Key:detectPath};
                            util.s3.deleteObject(deleteParams,function(err,data){
                                if(err != null){
                                    alert(util.templates.get('errorMessage').render({statusCode:err.statusCode,message:err.message}));
                                    console.log(err);
                                } else{
                                    util.hideStatus('Renaming object...');
                                    callback();
                                }
                            });
                        }
                    });
                }
            }
        }
    });
};

S3BrowserUtil.prototype.renameObject = function(existingPath, newPath, callback) {
    console.trace();
    var util = this;
    this.showStatus('Checking for existing object...');
    var overwrite = false;
    util.showStatus('Renaming object...');
    var updatedPath=newPath.split("/");
    var bucketName=updatedPath[1];
    var newPath1=updatedPath.splice(2, updatedPath.length).join('/');
    var params={Bucket:bucketName,Key:newPath1};
    var file=util.s3.headObject(params,function(err,data){
        util.hideStatus('Checking for existing object...');
        if(err != null){
            if(err.statusCode==404){
                var newParams={Bucket:bucketName,CopySource:bucketName+"/"+existingPath,Key:newPath1};
                util.s3.copyObject(newParams,function(err,data){
                    if(err != null){
                        if(err.statusCode==403){
                            alert(util.templates.get('bucketCors').render({bucketName:bucketName}));
                        }else{
                            alert(util.templates.get('errorMessage').render({statusCode:err.statusCode,message:err.message}));
                        }
                        console.log(err);
                    }else{
                        var deleteParams={Bucket:bucketName,Key:existingPath};
                        util.s3.deleteObject(deleteParams,function(err,data){
                            if(err != null){
                                if(err.statusCode==403){
                                    alert(util.templates.get('bucketCors').render({bucketName:bucketName}));
                                }else{
                                    alert(util.templates.get('errorMessage').render({statusCode:err.statusCode,message:err.message}));
                                }
                                console.log(err);
                            }else{
                                util.hideStatus('Renaming object...');
                                callback();
                            }
                        });
                    }
                });
            }else{
                console.log(err);
            }
        }else{
            overwrite = confirm(util.templates.get('itemExistsPrompt').render({
                name : newPath
            }));
            if (!overwrite){
                util.hideStatus('Renaming object...');
                return;
            }else{
                util.hideStatus('Renaming object...');
                if(existingPath==newPath1){
                    alert("Source and target are the same file");
                }else{
                    var newParams={Bucket:bucketName,CopySource:bucketName+"/"+existingPath,Key:newPath1};
                    util.s3.copyObject(newParams,function(err,data){
                        if(err != null){
                            if(err.statusCode==403){
                                alert(util.templates.get('bucketCors').render({bucketName:bucketName}));
                            }else{
                                alert(util.templates.get('errorMessage').render({statusCode:err.statusCode,message:err.message}));
                            }
                            console.log(err);
                        }else{
                            var deleteParams={Bucket:bucketName,Key:existingPath};
                            util.s3.deleteObject(deleteParams,function(err,data){
                                if(err != null){
                                    if(err.statusCode==403){
                                        alert(util.templates.get('bucketCors').render({bucketName:bucketName}));
                                    }else{
                                        alert(util.templates.get('errorMessage').render({statusCode:err.statusCode,message:err.message}));
                                    }
                                    console.log(err);
                                }else{
                                    util.hideStatus('Renaming object...');
                                    callback();
                                }
                            });
                        }
                    });
                }
            }
        }
    });
};

S3BrowserUtil.prototype.deleteObject = function(id, currentLocation, callback) {
    var util = this;
    this.showStatus('Deleting object...');
    var newpath = currentLocation.substring(1, currentLocation.length);
    var splits = newpath.split("/");
    var bucketName = splits[0];
    var params={
        Bucket: bucketName, /* required */
        Key: id,
    };
    util.s3.deleteObject(params,function(err,data){
        util.hideStatus('Deleting object...');
        if(err!=null){
            if(err.statusCode==403){
                alert(util.templates.get('bucketCors').render({bucketName:bucketName}));
            }else{
                alert(util.templates.get('errorMessage').render({statusCode:err.statusCode,message:err.message}));
            }
            //util.s3Error(err);
        }else{
            callback();
        }
    });
};

S3BrowserUtil.prototype.createVersion = function(id, callback) {
    var util = this;
    this.showStatus('Creating version...');
    this.s3.versionObject(id, function(result) {
        util.hideStatus('Creating version...');
        if (result.successful) {
            callback();
        }else{
            util.s3Error(result);
        }
    });
};

S3BrowserUtil.prototype.listVersions = function(id, currentLocation, callback) {
    var util = this;
    this.showStatus('Listing versions...');
    var newpath = currentLocation.substring(1, currentLocation.length);
    var splits = newpath.split("/");
    var bucketName = splits[0];
    var params={
        Bucket: bucketName,
        Prefix: id,
    };
    util.s3.listObjectVersions(params,function(err,data){
        util.showStatus('Listing versions...');
        if(err!=null){
            if(err.statusCode==403){
                alert(util.templates.get('bucketCors').render({bucketName:bucketName}));
            }else{
                alert(util.templates.get('errorMessage').render({statusCode:err.statusCode,message:err.message}));
            }
            //util.s3Error(err);
        }else{
            callback();
        }
    });
};

S3BrowserUtil.prototype.restoreVersion = function(id, vId, callback) {
    var util = this;
    this.showStatus('Restoring version...');
    this.s3.restoreVersion(id, vId, function(result) {
        util.hideStatus('Restoring version...');
        if (result.successful) {
            callback();
        }else{
            util.s3Error(result);
        }
    });
};

S3BrowserUtil.prototype.deleteVersion = function(vId, callback) {
    var util = this;
    this.showStatus('Deleting version...');
    this.s3.deleteVersion(vId, function(result) {
        util.hideStatus('Deleting version...');
        if (result.successful) {
            callback();
        }else{
            util.s3Error(result);
        }
    });
};

S3BrowserUtil.prototype.getShareableUrl = function(id,bucketName, date, asAttachment,    attachmentName) {
    console.trace();
    var fileName=this.getFileName(id);
    var expires = Math.floor( date.getTime() / 1000 );
    var params = {Bucket: bucketName, Key: id, Expires:expires};
    return this.s3.getSignedUrl('getObject',params);
};

S3BrowserUtil.prototype.createAttachmentDisposition=function(fileName){
    if ( fileName ) return "attachment; filename*=" + encodeURIComponent( "UTF-8''" + fileName );
    else return "attachment";
}

S3BrowserUtil.prototype.getFileName = function(path) {
    var pattern = /\/[^/]*$/;
    var name = pattern.exec(path);
    if (name) {
        if (name[0].length)
        name = name[0];
        return name.substr(1);
    }
    return path;
};

S3BrowserUtil.prototype.downloadFile = function(id, index, downloadName) {
    console.trace();
    var iframe = $('iframe#s3Iframe' + index);
    if (iframe.length == 0) {
        iframe = $('<iframe id="s3Iframe' + index
        + '" style="display: none;" />');
        $('body').append(iframe);
    }
    var newpath = downloadName.substring(1, downloadName.length);
    var splits = newpath.split("/");
    var bucketName = splits[0];
    var prefix = splits.splice(1, splits.length).join('/');
    iframe.prop('src', this.getShareableUrl(id,bucketName, this.futureDate(1, 'hours'),
    true, downloadName));
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
