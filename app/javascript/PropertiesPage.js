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
PropertiesPage = function( entry, util, templateEngine ) {
    this.entry = entry;
    this.util = util;
    this.templates = templateEngine;
    var requiredSelectors = [
        '.s3AddUserMetadataButton',
        '.s3UserMetadataTable',

        '.s3SystemMetadataTable',
        '.s3SaveButton',
        '.s3CancelButton'
    ];
    console.trace();
    this.$root = jQuery( templateEngine.get( 'propertiesPage' ).render( {}, requiredSelectors ) );
    var $addUserMetaButton = this.$root.find( '.s3AddUserMetadataButton' );
    this.$userMetaTable = this.$root.find( '.s3UserMetadataTable' ).empty();
   // var $addListableMetaButton = this.$root.find( '.s3AddListableMetadataButton' );
  //  this.$listableMetaTable = this.$root.find( '.s3ListableMetadataTable' ).empty();
    var $systemMetaTable = this.$root.find( '.s3SystemMetadataTable' ).empty();
    var $saveButton = this.$root.find( '.s3SaveButton' );
    var $cancelButton = this.$root.find( '.s3CancelButton' );

    var prop;
    for ( prop in entry.userMeta ) {
        if ( !entry.userMeta.hasOwnProperty( prop ) ) continue;
        this.addTag( this.$userMetaTable, prop, entry.userMeta[prop], true );
    }
//    for ( prop in entry.listableUserMeta ) {
//        if ( !entry.listableUserMeta.hasOwnProperty( prop ) ) continue;
//        this.addTag( this.$listableMetaTable, prop, entry.listableUserMeta[prop], true );
//    }
    for ( prop in entry.systemMeta ) {
        if ( !entry.systemMeta.hasOwnProperty( prop ) ) continue;
        this.addTag( $systemMetaTable, prop, entry.systemMeta[prop], false );
    }

    this.modalWindow = new ModalWindow( templateEngine.get( 'propertiesPageTitle' ).render( {name: entry.name || entry.id} ), this.$root, templateEngine );

    var page = this;
    $addUserMetaButton[0].onclick = function() {
        page.createTag( false );
    };
//    $addListableMetaButton[0].onclick = function() {
//        page.createTag( true );
//    };
    $saveButton[0].onclick = function() {
        page.save();
    };
    $cancelButton[0].onclick = function() {
        page.modalWindow.remove();
    };
};

PropertiesPage.prototype.addTag = function( $table, name, value, editable ) {
    var $propertyRow;
    if ( editable ) $propertyRow = jQuery( this.templates.get( 'editablePropertyRow' ).render( {name: name, value: value}, ['.s3PropertyName', 'input.s3PropertyValue', '.s3DeleteButton'] ) );
    else $propertyRow = jQuery( this.templates.get( 'readonlyPropertyRow' ).render( {name: name, value: value}, ['.s3PropertyName', '.s3PropertyValue'] ) );
    var $deleteButton = $propertyRow.find( '.s3DeleteButton' );
    if ( $deleteButton.length > 0 ) $deleteButton[0].onclick = function() {
        $propertyRow.remove();
    };
    $table.append( $propertyRow );
};
PropertiesPage.prototype.createTag = function( listable ) {
    var tag = prompt( this.templates.get( 'tagPrompt' ).render(), '' );
    while ( tag != null && tag.length > 0 && !this._validTag( tag ) ) {
        tag = prompt( this.templates.get( 'tagPrompt' ).render(), tag );
    }
    if ( tag != null && tag.length > 0 ) {
        this.addTag( listable ? this.$listableMetaTable : this.$userMetaTable, tag, '', true );
    }
};
PropertiesPage.prototype.save = function() {
    var page = this;

    var meta = this._getProperties( this.$userMetaTable );
    //var listableMeta = this._getProperties( this.$listableMetaTable );

   // var allTags = Object.keys( meta ).concat( Object.keys( listableMeta ) );
    var allTags = Object.keys( meta );
    var existingTags = Object.keys( page.entry.userMeta || {} ).concat( Object.keys( page.entry.listableUserMeta || {} ) );

    var deletedTags = [];
    for ( var i = 0; i < existingTags.length; i++ ) {
        var p = existingTags[i];
        if ( allTags.indexOf( p ) == -1 ) deletedTags.push( p );
    }

    var metaSaved = false, metaDeleted = false;
    var callComplete = function() {
        if ( metaSaved && metaDeleted ) page.modalWindow.remove();
    };
    if ( allTags.length > 0 ) {
        page.util.setUserMetadata( page.entry.prefixKey, meta, function() {
            metaSaved = true;
            callComplete();
        } );
    } else metaSaved = true;
    if ( deletedTags.length > 0 ) {
        page.util.setUserMetadata( page.entry.prefixKey, meta, function() {
            metaDeleted = true;
            callComplete();
        } );
    } else metaDeleted = true;
    callComplete(); // in case there's no metadata and no deletes
};
PropertiesPage.prototype._getProperties = function( $table ) {
    var properties = {};
    $table.find( '.row' ).each( function() {
        var $this = jQuery( this );
        var prop = $this.find( '.s3PropertyName' ).text();
        var $val = $this.find( '.s3PropertyValue' );
        var val = $val.is( 'input' ) ? $val.val() : $val.text();
        if ( prop ) properties[prop] = val;
    } );
    return properties;
};
PropertiesPage.prototype._validTag = function( tag ) {
    if ( !tag || tag.trim().length == 0 ) {
        alert( this.templates.get( 'tagEmpty' ).render() );
        return false;
    }
    var properties = {};
    jQuery.extend( properties, this._getProperties( this.$userMetaTable ));
    if ( properties.hasOwnProperty( tag ) ) {
        alert( this.templates.get( 'tagExists' ).render( {tag: tag} ) );
        return false;
    }
    if ( !this.util.validTag( tag ) ) {
        alert( this.templates.get( 'validNameError' ).render( {name: tag} ) );
        return false;
    }
    return true;
};
