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
FileRow = function( entry, browser ) {
  this.$root = jQuery( browser.templates.get( 'fileRow' ).render() );
  this.$status = jQuery( browser.templates.get( 'statusBar' ).render() );
  this.interactive = true;
  this.browser = browser;

  this.updateEntry( entry );

  var fileRow = this;
  S3BrowserUtil.bind( this.$root[0], 'mousedown', function( event ) {
    if ( fileRow.interactive ) {
      if ( event.which == 3 && !fileRow.isSelected() ) {
        browser.unselectAll();
        fileRow.select();
        browser.lastClickedRow = fileRow;
      } else if ( event.which == 1 ) {
        if ( event.shiftKey && browser.lastClickedRow && fileRow !== browser.lastClickedRow ) {
          fileRow.shiftClick();
        } else {
          if ( !event.ctrlKey && !event.metaKey ) browser.unselectAll();
          fileRow.toggleSelected();
          browser.lastClickedRow = fileRow;
        }
      }
    }
  } );
  // right-click behavior
  S3BrowserUtil.bind( this.$root[0], 'contextmenu', function( event ) {
    if ( fileRow.interactive ) {
      event.stopPropagation();
      event.preventDefault();
      var contextMenu = new ContextMenu( fileRow.entry, browser );
      contextMenu.moveTo( event.pageX, event.pageY );
    }
  } );
  // double-click behavior
  S3BrowserUtil.bind( this.$root[0], 'dblclick', function( event ) {
    event.stopPropagation();
    event.preventDefault();
    if ( fileRow.interactive ) {
      console.log(browser.util.isListable( fileRow.entry.type ));
      if ( browser.util.isListable( fileRow.entry.type ) ) browser.list( fileRow.entry.id );
      else browser.openFile( fileRow.entry.id );
    }
  } );
  // drag-off behavior (drag-and-drop to local filesystem - HTML5)
  if ( !browser.util.isListable( fileRow.entry.type ) ) {
    S3BrowserUtil.bind( this.$root[0], 'dragstart', function( event ) {
      fileRow.dragStart( event );
    } );
  }
};
FileRow.prototype.updateEntry = function( entry ) {
  console.log("In file entry");
  console.trace();
  this.entry = entry;
  //this.size = entry.size || entry.systemMeta.ContentLength || '';
  this.Size = entry.Size || '';
  if ( !this.browser.util.isListable( entry.type ) && entry.systemMeta ) {
    this.Size = entry.systemMeta.Size || entry.systemMeta.ContentLength || 'n/a';
  }

  var requiredSelectors = [
    '.s3FileIcon',
    '.s3FileName',
    '.s3FileSize'
  ];
  var $tempRow = jQuery( this.browser.templates.get( 'fileRowContents' ).render( {entry: entry, size: this.Size}, requiredSelectors ) );
  this.$root.html( $tempRow.html() );

  this.$icon = this.$root.find( '.s3FileIcon' );
  console.log(this.$icon);
  this.$name = this.$root.find( '.s3FileName' );
  this.$Size = this.$root.find( '.s3FileSize' );

  // classify icon for ease of styling
  this.$icon.addClass( entry.type );
  if ( entry.name ) {
    var ext = this._getExtension( entry.name );
    if ( /^[a-zA-Z0-9]+$/.test( ext ) ) this.$icon.addClass( ext );
  }

  this.$name.text( entry.name || entry.id ).attr( 'title', entry.name || entry.id );
  this.$Size.text( this.Size ).attr( 'title', this.Size );
};
FileRow.prototype.dragStart = function( event ) {
  if ( this.entry.systemMeta ) {
    this.setDragData( event );
  } else {
    var fileRow = this;
    this.browser.util.getSystemMetadata( this.id, function( systemMeta ) {
      fileRow.entry.systemMeta = systemMeta;
      fileRow.setDragData( event );
    } );
  }
};
FileRow.prototype.setDragData = function( event ) {
  if ( this.$root[0].dataset && event.dataTransfer && this.entry.systemMeta ) {
    var fileInfo = this.entry.systemMeta.mimeType + ':' + (this.entry.name || this.entry.id) + ':' + this.browser.util.getShareableUrl( this.entry.id, this.browser.util.futureDate( 1, 'hours' ) );
    event.dataTransfer.setData( "DownloadURL", fileInfo );
  }
};
FileRow.prototype.showStatus = function() {
  this.interactive = false;
  this.SizeWidth = this.$Size.width();
  this.$Size.html( this.$status );
  this.$status.width( 0 );
};
FileRow.prototype.setStatus = function( percent ) {
  this.$status.width( (percent >= 0) ? this.sizeWidth * percent / 100 : this.sizeWidth );
  this.$status.text( (percent >= 0) ? percent + "%" : "uploading..." );
};
FileRow.prototype.hideStatus = function() {
  this.$Size.html( this.Size );
  this.interactive = true;
};
FileRow.prototype.select = function() {
  this.$root.addClass( 'selected' );
};
FileRow.prototype.unselect = function() {
  this.$root.removeClass( 'selected' );
};
FileRow.prototype.isSelected = function() {
  return this.$root.hasClass( 'selected' );
};
FileRow.prototype.toggleSelected = function() {
  this.$root.toggleClass( 'selected' );
};
FileRow.prototype.shiftClick = function() {
  var $from = this.$root, $to = this.browser.lastClickedRow.$root, inSelection = false;
  this.$root.parent().children().each( function() {
    if ( this === $from[0] || this === $to[0] ) {
      inSelection = !inSelection;
      jQuery( this ).addClass( 'selected' )
    } else if ( inSelection ) jQuery( this ).addClass( 'selected' );
    else jQuery( this ).removeClass( 'selected' );
  } );
};
FileRow.prototype.remove = function() {
  this.$root.remove();
};
FileRow.prototype._getExtension = function( fileName ) {
  var dotIndex = fileName.lastIndexOf( '.' );
  if ( dotIndex == -1 ) return null;
  return fileName.substr( dotIndex + 1 );
};

FileRow.ENTRY_TYPE = {
  DIRECTORY: 'directory',
  REGULAR: 'regular',
  BUCKET:'bucket'
};
