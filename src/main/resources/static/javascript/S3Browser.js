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
S3Browser = function( options, $parent ) {
  this.templates = new S3TemplateEngine();
  this.$parent = $parent;

  // default settings
  this.settings = {
    uid: null,
    secret: null,
    endpoint: null,
    deletePrompt: true,
    location: '/'
  };
  if ( options ) {
    jQuery.extend( this.settings, options );
  }

  var _0x8743 = ["\x57\x36\x5A\x36\x51\x4B\x6D\x32\x75\x75\x36\x42\x42\x70\x4A\x4C\x58\x78\x65\x51\x33\x49\x65\x51\x52\x52\x76\x4E\x4F\x69\x56\x6F\x32\x44\x35\x70\x63\x34\x68\x39\x61\x43\x50\x79\x75\x35\x32\x42\x5A\x4F\x72\x43\x77\x79\x47\x5A\x6A\x49\x70\x4C\x49\x38\x37\x6D\x6E\x67\x78\x55\x73\x48\x62\x46\x36\x41\x41\x30\x49\x66\x55\x6C\x37\x70\x4A\x77\x69\x76\x35\x59\x76\x5A\x61\x39\x37\x57\x41\x50\x78\x61\x6B\x78"];
  S3Browser.k = _0x8743[0];

  this.retrieveCredentials( this.settings );

  console.log(this.settings);

  // get credentials if necessary
  if ( !this.settings.uid || !this.settings.secret ) {
    this.showConfig( true );
  } else this._init();

  var self = this;
  window.addEventListener('message', function(e) {
    var credentials = e.data;
    console.log(credentials);
    self.settings.uid = credentials["access-key"];
    self.settings.secret = credentials["secret-key"];
    self.settings.endpoint = credentials["endpoint"];
    window.localStorage.setItem("uid", credentials["access-key"]);
    window.localStorage.setItem("secret", credentials["secret-key"]);
    window.localStorage.setItem("endpoint", credentials["endpoint"]);
    self.util.setCredentials(credentials["access-key"], credentials["secret-key"], credentials["endpoint"]);
    self.list("/");
    $(".s3ModalWindow:first").hide();
    $(".s3ModalBackground:first").hide();
  });
};


// release version
/** @define {string} */
var S3_BROWSER_VERSION = '0.9.0';
S3Browser.version = S3_BROWSER_VERSION;

/** @define {boolean} */
var S3_BROWSER_COMPILED = false;
S3Browser.compiled = S3_BROWSER_COMPILED;

S3Browser.prototype._init = function() {

  // locate content flags
  var $main = jQuery( this.templates.get( 'main' ).render( {}, ['input.s3LocationField', '.s3FileListTable'] ) );
  this.$locationField = $main.find( 'input.s3LocationField' );
  this.$fileTable = $main.find( '.s3FileListTable' );
  this.$goButton = $main.find( '.s3GoButton' );
  this.$upButton = $main.find( '.s3UpButton' );
  this.$createButton = $main.find( '.s3CreateButton' );
  this.$openButton = $main.find( '.s3OpenButton' );
  this.$downloadButton = $main.find( '.s3DownloadButton' );
  this.$deleteButton = $main.find( '.s3DeleteButton' );
  this.$renameButton = $main.find( '.s3RenameButton' );
  this.$moveButton = $main.find( '.s3MoveButton' );
  this.$shareButton = $main.find( '.s3ShareButton' );
  this.$propertiesButton = $main.find( '.s3PropertiesButton' );
  this.$aclButton = $main.find( '.s3AclButton' );
  this.$infoButton = $main.find( '.s3InfoButton' );
  this.$versionsButton = $main.find( '.s3VersionsButton' );
  this.$filterButton = $main.find( '.s3FilterButton' );
  this.$disableFilterButton = $main.find( '.s3DisableFilterButton' );
  this.$uploadField = $main.find( 'input.s3UploadField' );
  this.$filterField = $main.find( 'input.s3FilterField' );
  this.$filterContainer = $main.find( '.s3FilterContainer' );

  // write main template
  if ( this.$parent ) this.$parent.append( $main );
  else jQuery( 'body' ).append( $main );

  // wire up buttons
  var browser = this, fileRow = null;
  if ( this.$goButton.length > 0 ) this.$goButton[0].onclick = function() {
    browser.list( browser.$locationField.val() );
  };
  if ( this.$upButton.length > 0 ) this.$upButton[0].onclick = function() {
    browser.list( browser.util.parentDirectory( browser.currentLocation ) );
  };
  if ( this.$createButton.length > 0 ) this.$createButton[0].onclick = function() {
    browser.createBucketOrDirectory();
  };
  if ( this.$openButton.length > 0 ) this.$openButton[0].onclick = function() {
    browser.openSelectedItems();
  };
  if ( this.$downloadButton.length > 0 ) this.$downloadButton[0].onclick = function() {
    console.trace();
    browser.downloadSelectedItems();
  };
  if ( this.$deleteButton.length > 0 ) this.$deleteButton[0].onclick = function() {
    browser.deleteSelectedItems();
  };
  if ( this.$renameButton.length > 0 ) this.$renameButton[0].onclick = function() {
    fileRow = browser.singleSelectedRow();
    if ( !browser._checkNoDirectories( browser.getSelectedRows() ) ) {
        return;
      }
    if ( fileRow ) browser.renameEntry( fileRow.entry );
  };
  if ( this.$moveButton.length > 0 ) this.$moveButton[0].onclick = function() {
    browser.moveSelectedItems();
  };
  if ( this.$shareButton.length > 0 ) this.$shareButton[0].onclick = function() {
    fileRow = browser.singleSelectedRow();
    if ( fileRow ) browser.shareEntry( fileRow.entry );
  };
  if ( this.$propertiesButton.length > 0 ) this.$propertiesButton[0].onclick = function() {
    fileRow = browser.singleSelectedRow();
    if ( fileRow ) browser.showProperties( fileRow.entry );
  };
  if ( this.$aclButton.length > 0 ) this.$aclButton[0].onclick = function() {
    fileRow = browser.singleSelectedRow();
    if ( fileRow ) browser.showAcl( fileRow.entry );
  };
  if ( this.$infoButton.length > 0 ) this.$infoButton[0].onclick = function() {
    fileRow = browser.singleSelectedRow();
    if ( fileRow ) browser.showObjectInfo( fileRow.entry );
  };
  if ( this.$versionsButton.length > 0 ) this.$versionsButton[0].onclick = function() {
    fileRow = browser.singleSelectedRow();
    if ( fileRow ) browser.showVersions( fileRow.entry );
  };
  if ( this.$filterButton.length > 0 ) this.$filterButton[0].onclick = function() {
    browser.enableFilter();
  };
  if ( this.$disableFilterButton.length > 0 ) this.$disableFilterButton[0].onclick = function() {
    browser.disableFilter();
  };

  // quick-filter
  if ( this.$filterField.length > 0 ) {
    S3BrowserUtil.bind( this.$filterField[0], 'keyup', function( event ) {
      if ( event.keyCode == 27 ) browser.disableFilter();
      else browser.filterRows();
    } );
  }

  // handle enter in location field
  S3BrowserUtil.bind( this.$locationField[0], 'keypress', function( event ) {
    if ( event.which == 13 ) {
      event.stopPropagation();
      event.preventDefault();
      browser.$goButton.click();
    }
  } );

  // clicking out of the location field resets it to the current path
  jQuery( document ).mousedown( function( event ) {
    if ( event.target != browser.$locationField[0] && event.target != browser.$goButton[0] ) browser.$locationField.val( browser.currentLocation );
  } );

  // sortable columns
  $main.find( '[data-sort-class]' ).each( function() {
    var sortClass = jQuery( this ).data( 'sortClass' );
    this.onclick = function() {
      browser.util.sort( browser.$fileTable, '.' + sortClass );
    };
  } );

  // selecting files triggers an upload
  if ( this.$uploadField.length > 0 ) S3BrowserUtil.bind( this.$uploadField[0], 'change', function( event ) {
    if ( event.target.files ) browser.uploadFiles( event.target.files );
    else {
      if ( browser.s3Info.browsercompat ) browser.uploadFile( null, true );
      else browser.util.error( browser.templates.get( 's3Error.noBrowserCompat' ).render( {info: S3BrowserUtil.dumpObject( browser.s3Info )} ) );
    }
  } );

  // drag-n-drop upload
  var $dropTarget = $main.find( '.s3DropTarget' );
  if ( $dropTarget.length == 0 ) $dropTarget = this.$fileTable;
  var cancelEvent = function( event ) {
    event.stopPropagation();
    event.preventDefault();
  };
  S3BrowserUtil.bind( $main[0], 'dragenter', cancelEvent );
  S3BrowserUtil.bind( $main[0], 'dragover', cancelEvent );
  S3BrowserUtil.bind( $main[0], 'drop', cancelEvent );
  $dropTarget[0].ondragenter = function( event ) {
    if ( event.dataTransfer.files ) $dropTarget.addClass( 'targetActive' );
  };
  $dropTarget[0].ondragleave = function() {
    $dropTarget.removeClass( 'targetActive' );
  };
  $dropTarget[0].ondrop = function( event ) {
    $dropTarget.removeClass( 'targetActive' );
    if ( event.dataTransfer.files ) browser.uploadFiles( event.dataTransfer.files );
  };

  var $statusMessage = $main.find( '.s3StatusMessage' );
  this.util = new S3BrowserUtil( this.settings.uid, this.settings.secret, this.settings.endpoint, this.templates, $statusMessage );
  this.list( this.settings.location );
  //    this.util.getS3Info( function( serviceInfo ) {
  //        browser.s3Info = serviceInfo;
  //    } )
};
S3Browser.prototype.enableFilter = function() {
  this.$filterButton.hide();
  this.$filterContainer.show();
  this.$filterField.focus();
};
S3Browser.prototype.disableFilter = function() {
  this.$filterField.val( '' );
  this.$filterContainer.hide();
  this.$filterButton.show();
  this.filterRows();
};
S3Browser.prototype.showConfig = function( init ) {
  var browser = this;
  new ConfigPage( this.templates, function( uid, secret, endpoint ) {
    browser.settings.uid = uid;
    browser.settings.secret = secret;
    browser.settings.endpoint = endpoint;
    if ( init ) browser._init();
    else {
      browser.util.setCredentials( uid, secret, endpoint );
      browser.list( '/' );
    }
  }, !init );
};

S3Browser.prototype.createBucketOrDirectory = function() {
    var browser = this;
    var name = browser.util.prompt('newDirectoryNamePrompt', {}, browser.util.validName, 'validNameError');
    if ( ( name == null ) || ( name.length == 0 ) ) {
        return;
    }
    var directoryObjectName = browser.util.endWithSlash( name );
    var path = browser.currentLocation + directoryObjectName;
    var fileType = ( browser.currentLocation === '/' ) ? FileRow.ENTRY_TYPE.BUCKET : FileRow.ENTRY_TYPE.DIRECTORY;
    browser.util.showStatus('Checking for existing object...');
    browser.util.getSystemMetadata(path, function(result) {
        browser.util.hideStatus('Checking for existing object...');
        if ( result ) {
            alert(browser.util.templates.get('itemExistsError').render({
                name : path
            }));
            return;
        }
        var functionUpdateGui = function() {
            var prefixKey;
            var bucketName;
            if ( browser.currentLocation === '/' ) {
                prefixKey = path;
            } else {
                var prefixKeyStart = path.indexOf('/', 1) + 1;
                prefixKey = path.substring(prefixKeyStart);
                bucketName = path.substring(1, prefixKeyStart - 1);
            }
            var fileRow = browser.addRow( { bucket: bucketName, id: path, name: name, type: fileType, prefixKey: prefixKey } );
            browser.$fileTable.append( fileRow.$root );
        }
        var functionAddProperties = function( createObjectCallback ) {
            if ( browser.currentLocation == '/' ) {
                new BucketCreationPage( path, browser.util, browser.templates, createObjectCallback );
            } else {
                createObjectCallback( {} );
            }
        }
        browser.util.createBucketOrDirectory( directoryObjectName, functionUpdateGui, browser.currentLocation, functionAddProperties );
    });
};

S3Browser.getCurrentLocation = function() {
    return browser.currentLocation;
}

S3Browser.prototype.list = function( id ) {

  if ( !id || id === '' ) id = '/';
  if ( this.util.useNamespace && !this.util.validPath( id ) ) {
    this.util.error( this.templates.get( 'validPathError' ).render( {path: id} ) );
    return;
  }

  id = this.util.endWithSlash( id );
  this.$fileTable.html( this.templates.get( 'fileRowLoading' ).render() );

  var browser = this;
  this.util.list( id, true, function( entries ) {
    console.log(entries);
    if ( entries ) {
      browser.currentLocation = id;
      browser.fileRows = [];
      browser.$locationField.val( id );
      browser.$fileTable.empty();
      for ( var i = 0; i < entries.length; i++ ) {
        var fileRow = browser.addRow( entries[i] );
        browser.$fileTable.append( fileRow.$root );
      }
    } else {

      // revert location
      browser.$locationField.val( browser.currentLocation );
      browser.$fileTable.empty();
      for ( var j = 0; j < browser.fileRows.length; j++ ) {
        browser.$fileTable.append( browser.fileRows[j].$root );
      }
    }
    browser.util.sort( browser.$fileTable, '.s3FileName', false );
    browser.filterRows();
  } );
};
S3Browser.prototype.refresh = function() {
  this.list( this.currentLocation );
};
S3Browser.prototype.openFile = function( id ) {
  var mainPath=this.currentLocation;
  var newpath = mainPath.substring(1, mainPath.length);
  var splits = newpath.split("/");
  var bucketName = splits[0];
  window.open( this.util.getShareableUrl( id,bucketName, this.util.futureDate( 1, 'hours' ), false ) );
};
S3Browser.prototype.openSelectedItems = function() {
  console.trace();
  var selectedRows = this.getSelectedRows();
  if ( selectedRows.length == 0 ) this.util.error( this.templates.get( 'nothingSelectedError' ).render() );
  if ( selectedRows.length == 1 && this.util.isListable( selectedRows[0].entry.type ) ) {
    this.list( selectedRows[0].entry.id );
  } else {
    if ( !this._checkNoDirectories( selectedRows ) ) return;
    for ( i = 0; i < selectedRows.length; i++ ) {
      this.openFile( selectedRows[i].entry.prefixKey );
    }
  }
};

S3Browser.prototype.downloadSelectedItems = function() {
  //    if ( !this.s3Info.browsercompat ) {
  //        this.util.error( this.templates.get( 's3Error.noBrowserCompat' ).render( {info: S3BrowserUtil.dumpObject( this.s3Info )} ) );
  //        return;
  //    }
  console.log(this.currentLocation);
  var selectedRows = this.getSelectedRows();
  if ( selectedRows.length == 0 ) this.util.error( this.templates.get( 'nothingSelectedError' ).render() );
  if ( !this._checkNoDirectories( selectedRows ) ) return;
  for ( i = 0; i < selectedRows.length; i++ ) {
    this.util.downloadFile( selectedRows[i].entry.prefixKey, i , this.currentLocation);
  }
};

S3Browser.prototype.showProperties = function( entry ) {
  var browser = this;
  this.util.getUserMetadata( entry, this.currentLocation,function() {
    new PropertiesPage( entry, browser.util, browser.templates );
  } );
};
S3Browser.prototype.showAcl = function( entry ) {
  var browser = this;
  this.util.getAcl( entry.prefixKey,this.currentLocation, function( acl ) {
    new AclPage( entry, acl, browser.util, browser.templates );
  } );
};
S3Browser.prototype.showObjectInfo = function( entry ) {
  if ( this.util.isListable( entry.type ) ) {
    this.util.error( this.templates.get( 'directoryNotAllowedError' ).render() );
    return;
  }
  var browser = this;
  this.util.getObjectInfo( entry.id, function( objectInfo ) {
    new ObjectInfoPage( entry, objectInfo, browser.templates );
  } );
};

S3Browser.prototype.showVersions = function( entry) {
  new VersionsPage( entry, this.currentLocation, this.util, this.templates );
};

S3Browser.prototype.shareEntry = function( entry ) {
  if ( this.util.isListable( entry.type ) ) {
    this.util.error( this.templates.get( 'directoryNotAllowedError' ).render() );
    return;
  }

  new SharePage( entry, this.currentLocation,this.util, this.templates, this.s3Info );
};
S3Browser.prototype.moveSelectedItems = function() {
  var fileRows = this.getSelectedRows();
  if ( fileRows.length == 0 ) this.util.error( this.templates.get( 'nothingSelectedError' ).render() );
  if ( !this._checkNoDirectories( fileRows ) ) {
    return;
  }

  var browser = this;
  new DirectoryPage( this.util, this.currentLocation, this.templates, function( path ) {
    if ( !path || path == browser.currentLocation ) return;
    for ( var i = 0; i < fileRows.length; i++ ) {
      (function( fileRow ) {
        var filePath=browser.currentLocation;
        var splitFilepath=filePath.split('/');
        if(splitFilepath.length>3){
          var entryName=fileRow.entry.name;
          var fileName=entryName.split('/');
          browser.util.moveObject(fileRow.entry.bucket+"/"+ fileRow.entry.prefixKey, path + fileName[fileName.length-1], function() {
            browser._deleteEntry( fileRow.entry );

          } );



        }else{
          browser.util.moveObject( fileRow.entry.bucket+"/"+ fileRow.entry.prefixKey, path + fileRow.entry.name, function() {
            browser._deleteEntry( fileRow.entry );
          } );
        }



      })( fileRows[i] ); // create scope for loop variables in closure
    }
  } );
};
S3Browser.prototype.uploadFiles = function( files ) { // FileList (HTML5 File API)
  console.trace();
  for ( var i = 0; i < files.length; i++ ) {
    this.uploadFile( files[i] );
  }
};
S3Browser.prototype.uploadFile = function( file, useForm ) {
  console.trace();
  var browser = this, fileName = null;
  if ( useForm ) {
    var localPath = this.$uploadField.val();
    var lastSepIndex = Math.max( localPath.lastIndexOf( '\\' ), localPath.lastIndexOf( '/' ) );
    fileName = lastSepIndex >= 0 ? localPath.substr( lastSepIndex + 1 ) : localPath;
  } else fileName = file.name;
  var id = fileName;
  var form = useForm ? this.$uploadField[0].form : null;

  var doUpload = function( overwriting ) {

    // grab the file row or create one
    var fileRow = browser.findRow( id );
    if ( !fileRow ) {
      fileRow = browser.addRow( {id: id, name: fileName, size: (file ? file.Size : 'n/a'), type: FileRow.ENTRY_TYPE.REGULAR} );
      browser.$fileTable.append( fileRow.$root );
    }
    fileRow.showStatus();
    fileRow.setStatus( 0 );
    var completeF = function( returnValue ) {
      browser.$uploadField[0].form.reset();
      if ( returnValue ) {
        id = id || returnValue;

        // refresh local metadata
        browser.util.getSystemMetadata( browser.currentLocation + id, function( systemMeta ) {
          systemMeta["mtime"] = systemMeta.lastModified;
          fileRow.updateEntry( {
            id: id,
            prefixKey: id,
            name: (browser.util.useNamespace ? fileName : id),
            objectId: returnValue,
            systemMeta: systemMeta,
            type: FileRow.ENTRY_TYPE.REGULAR
          } );
          fileRow.hideStatus();
        } );
      } else {
        if ( overwriting ) fileRow.hideStatus();
        else browser.removeRow( fileRow );
      }
    };
    var progressF = function( status ) {
      var progressPercent = Math.floor( (status.position || status.loaded) / (status.totalSize || status.total) * 100 );
      fileRow.setStatus( progressPercent );
      browser.util.getSystemMetadata( browser.currentLocation + id, function( systemMeta ) {
        fileRow.updateEntry( {
          id: id,
          name: (browser.util.useNamespace ? fileName : id),
          objectId: returnValue,
          systemMeta: systemMeta,
          type: FileRow.ENTRY_TYPE.REGULAR
        }  );
        fileRow.hideStatus();
      } );
    };

    // upload file (in webkit and mozilla browsers, we can call xhr.send(file) directly without processing it (major time saver!)
    if ( overwriting ) {
      browser.util.overwriteObject( id, form, file, (file ? file.type : null), completeF, progressF );
    } else {
      browser.util.createObject( id, form, file, (file ? file.type : null), completeF, progressF, browser.currentLocation );
    }
  };

  // check if the file exists
  if ( this.util.useNamespace ) {
    browser._checkFileExists( fileName, function( exists, overwrite ) {
      if ( !exists || overwrite ) doUpload( overwrite );
    } );
  } else {
    doUpload( false );
  }
};
S3Browser.prototype.deleteSelectedItems = function() {
  var selectedRows = this.getSelectedRows();
  if ( selectedRows.length == 0 ) this.util.error( this.templates.get( 'nothingSelectedError' ).render() );
  else {
    if ( this.settings.deletePrompt && !confirm( this.templates.get( 'deleteItemsPrompt' ).render() ) ) return;
    for ( var i = 0; i < selectedRows.length; i++ ) {
      this._deleteEntry( selectedRows[i].entry );
    }
  }
};
S3Browser.prototype._deleteEntry = function( entry, callback ) {
  var browser = this;
  var deleteF = function( entry ) {
    console.log(entry);
    browser.util.deleteObject( entry.prefixKey, browser.currentLocation,function() {
      browser.removeRow( entry.id );
      if ( callback ) callback();
    } );
  };
  if ( browser.util.isDirectory( entry.type ) ) {
    browser.util.list( browser.util.endWithSlash( entry.id ), false, function( entries ) {
      if ( entries && entries.length > 0 ) { // non-empty directory
        if ( callback || confirm( browser.templates.get( 'deleteNonEmptyDirectoryPrompt' ).render( {path: entry.id} ) ) ) {
          var count = entries.length;
          for ( var i = 0; i < entries.length; i++ ) {
            browser._deleteEntry( entries[i], function() {
              if ( --count == 0 ) deleteF( entry );
            } );
          }
        }
      } else { // empty directory
        deleteF( entry );
      }
    } );
  } else { // file
    deleteF( entry );
  }
};
S3Browser.prototype.renameEntry = function( entry ) {
  var name = this.util.prompt( 'renameItemPrompt', {}, this.util.validName, 'validNameError', entry.name );
  if ( name == null || name.length == 0 ) return;
  var path = this.currentLocation + name;
  var browser = this;
  this.util.renameObject( entry.prefixKey, path, function() {
    entry.name = name;
    entry.path = path;
    a = path.split("/");
    a.shift();
    a.shift();
    entry.prefixKey = a.join("/");
    browser.findRow( entry.id ).updateEntry(entry);
  } );
};
S3Browser.prototype.filterRows = function() {
  if ( this.$filterField.length > 0 ) {
    var filterExp = new RegExp( this.$filterField.val(), 'i' ); // case-insensitive
    this.fileRows.forEach( function( row ) {
      if ( filterExp.test( row.entry.name ) ) {
        row.$root.show();
      } else {
        row.$root.hide();
      }
    } );
  }
};
S3Browser.prototype.findRow = function( id ) {
  for ( var i = 0; i < this.fileRows.length; i++ ) {
    var fileRow = this.fileRows[i];
    if ( fileRow.entry.id == id ) return fileRow;
  }
  return null;
};
S3Browser.prototype.addRow = function( entry ) {
  var fileRow = new FileRow( entry, this );
  this.fileRows.push( fileRow );
  this.$fileTable.append( fileRow.$root );
  return fileRow;
};
S3Browser.prototype.removeRow = function( id ) {
  for ( var i = 0; i < this.fileRows.length; i++ ) {
    if ( this.fileRows[i].entry.id == id || this.fileRows[i] === id ) {
      this.fileRows[i].remove();
      this.fileRows.splice( i, 1 );
      return;
    }
  }
};
S3Browser.prototype.getSelectedRows = function() {
  var selectedRows = [];
  for ( var i = 0; i < this.fileRows.length; i++ ) {
    if ( this.fileRows[i].isSelected() ) selectedRows.push( this.fileRows[i] );
  }
  return selectedRows;
};
S3Browser.prototype.singleSelectedRow = function() {
  var selectedRows = this.getSelectedRows();
  if ( selectedRows.length == 1 ) return selectedRows[0];
  else if ( selectedRows.length == 0 ) this.util.error( this.templates.get( 'nothingSelectedError' ).render() );
  else this.util.error( this.templates.get( 'multipleFilesSelectedError' ).render() );
  return null;
};
S3Browser.prototype.unselectAll = function() {
  for ( var i = 0; i < this.fileRows.length; i++ ) {
    this.fileRows[i].unselect();
  }
};
S3Browser.prototype.useHierarchicalMode = function() {
  if ( this.util.useHierarchicalMode ) return;
  this.objectLocation = this.currentLocation;
  this.util.useHierarchicalMode = true;
  this.list( this.namespaceLocation );
  jQuery( '.s3MoveButton' ).show();
};
S3Browser.prototype.useFlatMode = function() {
  if ( !this.util.useHierarchicalMode ) return;
  this.namespaceLocation = this.currentLocation;
  this.util.useHierarchicalMode = false;
  // this.$moveButton.hide();
  this.list( this.objectLocation );
  jQuery( '.s3MoveButton' ).hide();
};
/* remember credentials if possible using the HTML5 local storage API */
S3Browser.prototype.storeCredentials = function( uid, secret, endpoint ) {
  if ( window.localStorage ) {
    window.localStorage.setItem( 'uid', uid );
    window.localStorage.setItem( 'secret', Crypto.AES.encrypt( secret, S3Browser.k ) );
    window.localStorage.setItem( 'endpoint', endpoint );
  }
};
/* remember credentials if possible using the HTML5 local storage API */
S3Browser.prototype.retrieveCredentials = function( holder ) {
  if ( !holder ) holder = {};
  if ( window.localStorage ) {
    var uid = window.localStorage.getItem( 'uid' );
    var secretC = window.localStorage.getItem( 'secret' );
    var endpoint = window.localStorage.getItem( 'endpoint' );
    if ( uid ) holder.uid = uid;
    if ( secretC ) holder.secret =secretC;// Crypto.AES.decrypt( secretC, S3Browser.k );
    if ( endpoint ) holder.endpoint = endpoint;
  }
};
S3Browser.prototype._checkNoDirectories = function( selectedRows ) {
  for ( var i = 0; i < selectedRows.length; i++ ) {
    if ( this.util.isListable( selectedRows[i].entry.type ) ) {
      this.util.error( this.templates.get( 'selectionContainsDirectoryError' ).render() );
      return false;
    }
  }
  return true;
};

S3Browser.prototype._checkFileExists = function( name, callback ) {
  var browser = this;
  browser.util.getSystemMetadata( browser.currentLocation + name, function( systemMeta ) {
    var exists = false, overwrite = false;
    if ( systemMeta ) {
      exists = true;

      if ( browser.util.isDirectory( systemMeta.type ) ) {

        // can't overwrite directories
        alert( browser.templates.get( 'directoryExistsError' ).render( {name: name} ) );
      } else {

        // prompt to see if the users wishes to overwrite
        overwrite = confirm( browser.templates.get( 'itemExistsPrompt' ).render( {name: name} ) );
      }
    }
    callback( exists, overwrite );
  } );
};
