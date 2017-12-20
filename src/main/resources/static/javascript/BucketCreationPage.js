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
    var $addUserMetadataButton = this.$root.find( '.s3AddUserMetadataButton' );
    this.$userMetadataTable = this.$root.find( '.s3UserMetadataTable' ).empty();
    this.$systemMetadataTable = this.$root.find( '.s3SystemMetadataTable' ).empty();
    this.addSystemMetadataRow( 'CreateTime', '' );
    this.addSystemMetadataRow( 'LastModified', '' );
    this.addSystemMetadataRow( 'ObjectName', '' );
    this.addSystemMetadataRow( 'Owner', '' );
    this.addSystemMetadataRow( 'Size', '' );
    var $saveButton = this.$root.find( '.s3SaveButton' );
    var $cancelButton = this.$root.find( '.s3CancelButton' );

    this.modalWindow = new ModalWindow( templateEngine.get( 'bucketCreationPageTitle' ).render( { name: name } ), this.$root, templateEngine );

    var page = this;
    $addUserMetadataButton[0].onclick = function() {
        page.addUserMetadata();
    };

    $saveButton[0].onclick = function() {
        page.save();
    };

    $cancelButton[0].onclick = function() {
        page.modalWindow.remove();
    };
};

BucketCreationPage.prototype.addUserMetadataRow = function( name, type ) {
    var $metadataRow;
    $metadataRow = jQuery( this.templates.get( 'userMetadataRow' ).render( {name: name, type: type}, ['.s3MetadataName', 'select.s3MetadataType', '.s3DeleteButton'] ) );
    var $deleteButton = $metadataRow.find( '.s3DeleteButton' );
    if ( $deleteButton.length > 0 ) $deleteButton[0].onclick = function() {
    	$metadataRow.remove();
    };
    this.$userMetadataTable.append( $metadataRow );
};

BucketCreationPage.prototype.addSystemMetadataRow = function( name, type ) {
    var $metadataRow;
    $metadataRow = jQuery( this.templates.get( 'systemMetadataRow' ).render( {name: name, type: type}, ['.s3MetadataName', 'select.s3MetadataType', 'input.s3MetadataSelected'] ) );
    this.$systemMetadataTable.append( $metadataRow );
};

BucketCreationPage.prototype.addUserMetadata = function() {
    var metadataName = prompt( this.templates.get( 'metadataNamePrompt' ).render(), '' );
    while ( metadataName != null && metadataName.length > 0 && !this._validMetadataName( metadataName ) ) {
        metadataName = prompt( this.templates.get( 'metadataNamePrompt' ).render(), metadataName );
    }
    if ( metadataName != null && metadataName.length > 0 ) {
        this.addUserMetadataRow( metadataName, 'string' );
    }
};

BucketCreationPage.prototype.save = function() {
    var page = this;
    var metadata = page._getAllMetadata();
    var keys;
    for (var metadataName in metadata ) {
        keys = page.util.addKey( keys, metadataName, metadata[metadataName] );
    }
    var headers = {};
    if ( keys ) {
      headers['x-emc-metadata-search'] = keys;
    }
    page.modalWindow.remove();
    page.bucketCreateFunction( headers );
};

BucketCreationPage.prototype._getAllMetadata = function() {
    var allMetadata = {};
    var page = this;
    page.$userMetadataTable.find( '.row' ).each( function() {
        var $this = jQuery( this );
        page._getMetadata( allMetadata, $this, 'x-amz-meta-' );
    } );
    page.$systemMetadataTable.find( '.row' ).each( function() {
        var $this = jQuery( this );
        var $selected = $this.find( '.s3MetadataSelected' );
        var selected = $selected[0].checked;
        if (selected) {
            page._getMetadata( allMetadata, $this );
        }
    } );
    return allMetadata;
};

BucketCreationPage.prototype._getMetadata = function( allMetadata, $row, metaPrefix ) {
    var metadata = $row.find( '.s3MetadataName' ).text();
    if ( metadata ) {
        if (metaPrefix ) {
            metadata = metaPrefix + metadata;
        }
        var type =  $row.find( '.s3MetadataType' ).val();
        allMetadata[metadata] = type;
    }
};

BucketCreationPage.prototype._validMetadataName = function( metadataName ) {
    if ( !metadataName || metadataName.trim().length == 0 ) {
        alert( this.templates.get( 'metadataNameEmpty' ).render() );
        return false;
    }
    if ( this._getAllMetadata().hasOwnProperty( metadataName ) ) {
        alert( this.templates.get( 'metadataNameExists' ).render( {metadataName: metadataName} ) );
        return false;
    }
    if ( !this.util.validMetadataName( metadataName ) ) {
        alert( this.templates.get( 'validNameError' ).render( {name: metadataName} ) );
        return false;
    }
    return true;
};
