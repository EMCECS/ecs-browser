/*
 * Copyright (c) 2017, EMC Corporation. All rights reserved.
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
BucketCreationPage = function( name, util, templateEngine, bucketCreateFunction ) {
    this.name = name;
    this.util = util;
    this.templates = templateEngine;
    this.bucketCreateFunction = bucketCreateFunction;
    var requiredSelectors = [
        '.s3AddUserMetadataButton',
        '.s3UserMetadataTable',
        '.s3SystemMetadataTable',
        '.s3SaveButton',
        '.s3CancelButton'
    ];
    console.trace();
    this.$root = jQuery( templateEngine.get( 'bucketCreationPage' ).render( {}, requiredSelectors ) );
    var $addUserMetaButton = this.$root.find( '.s3AddUserMetadataButton' );
    this.$userMetaTable = this.$root.find( '.s3UserMetadataTable' ).empty();
    var $systemMetaTable = this.$root.find( '.s3SystemMetadataTable' ).empty();
    var $saveButton = this.$root.find( '.s3SaveButton' );
    var $cancelButton = this.$root.find( '.s3CancelButton' );

    this.modalWindow = new ModalWindow( templateEngine.get( 'bucketCreationPageTitle' ).render( { name: name } ), this.$root, templateEngine );

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

BucketCreationPage.prototype.addTag = function( $table, name, value, editable ) {
    var $propertyRow;
    if ( editable ) $propertyRow = jQuery( this.templates.get( 'editablePropertyRow' ).render( {name: name, value: value}, ['.s3PropertyName', 'input.s3PropertyValue', '.s3DeleteButton'] ) );
    else $propertyRow = jQuery( this.templates.get( 'readonlyPropertyRow' ).render( {name: name, value: value}, ['.s3PropertyName', '.s3PropertyValue'] ) );
    var $deleteButton = $propertyRow.find( '.s3DeleteButton' );
    if ( $deleteButton.length > 0 ) $deleteButton[0].onclick = function() {
        $propertyRow.remove();
    };
    $table.append( $propertyRow );
};

BucketCreationPage.prototype.createTag = function() {
    var tag = prompt( this.templates.get( 'tagPrompt' ).render(), '' );
    while ( tag != null && tag.length > 0 && !this._validTag( tag ) ) {
        tag = prompt( this.templates.get( 'tagPrompt' ).render(), tag );
    }
    if ( tag != null && tag.length > 0 ) {
        this.addTag( this.$userMetaTable, tag, '', true );
    }
};

BucketCreationPage.prototype.save = function() {
    var page = this;
    var headers = {};
    var keys = '';
    keys = this.util.addKey( keys, 'LastModified' );
    keys = this.util.addKey( keys, 'Size' );
    keys = this.util.addKey( keys, 'date' );
    keys = this.util.addKey( keys, 'contentlength' );
    keys = this.util.addKey( keys, 'contentmd5' );
    keys = this.util.addKey( keys, 'key1', 'string', true );
    if ( keys ) {
      headers['X-emc-metadata-search'] = keys;
    }
    this.bucketCreateFunction( headers );
};

BucketCreationPage.prototype._getProperties = function( $table ) {
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

BucketCreationPage.prototype._validTag = function( tag ) {
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
