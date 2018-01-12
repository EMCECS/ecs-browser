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
    var $systemMetaTable = this.$root.find( '.s3SystemMetadataTable' ).empty();
    var $saveButton = this.$root.find( '.s3SaveButton' );
    var $cancelButton = this.$root.find( '.s3CancelButton' );

    var prop;
    for ( prop in entry.userMeta ) {
        if ( !entry.userMeta.hasOwnProperty( prop ) ) continue;
        this.addTag( this.$userMetaTable, prop, entry.userMeta[prop], true );
    }
    for ( prop in entry.systemMeta ) {
        if ( !entry.systemMeta.hasOwnProperty( prop ) ) continue;
        this.addTag( $systemMetaTable, prop, entry.systemMeta[prop], false );
    }

    this.modalWindow = new ModalWindow( templateEngine.get( 'propertiesPageTitle' ).render( { name: entry.name } ), this.$root, templateEngine );

    var page = this;
    $addUserMetaButton[0].onclick = function() {
        page.createTag();
    };
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
PropertiesPage.prototype.createTag = function() {
    var tag = prompt( this.templates.get( 'tagPrompt' ).render(), '' );
    while ( tag != null && tag.length > 0 && !this._validTag( tag ) ) {
        tag = prompt( this.templates.get( 'tagPrompt' ).render(), tag );
    }
    if ( tag != null && tag.length > 0 ) {
        this.addTag( this.$userMetaTable, tag, '', true );
    }
};
PropertiesPage.prototype.save = function() {
    var page = this;

    var meta = this._getProperties( this.$userMetaTable );
    var allTags = Object.keys( meta );
    var existingTags = Object.keys( page.entry.userMeta || {} );

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
        page.util.setUserMetadata( page.entry, meta, function() {
            metaSaved = true;
            callComplete();
        } );
    } else metaSaved = true;
    if ( deletedTags.length > 0 ) {
        page.util.setUserMetadata( page.entry, meta, function() {
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
