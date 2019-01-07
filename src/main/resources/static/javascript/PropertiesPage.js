/*
 * Copyright 2011-2019 Dell Inc. or its subsidiaries. All rights reserved.
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
    if ( entry.systemMeta[ 'owner' ] ) {
        if ( !entry.systemMeta[ 'ownerDisplayName' ] ) {
            entry.systemMeta[ 'ownerDisplayName' ] = entry.systemMeta[ 'owner' ].displayName;
        }
        if ( !entry.systemMeta[ 'ownerId' ] ) {
            entry.systemMeta[ 'ownerId' ] = entry.systemMeta[ 'owner' ].id;
        }
    }
    for ( prop in entry.systemMeta ) {
        if ( !entry.systemMeta.hasOwnProperty( prop ) ) continue;
        this.addTag( $systemMetaTable, prop, entry.systemMeta[prop], false );
    }

    this.modalWindow = new ModalWindow( templateEngine.get( 'propertiesPageTitle' ).render( entry ), this.$root, templateEngine );

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
    page.util.setUserMetadata( page.entry, page._getUserProperties(), function() {
        page.modalWindow.remove();
    } );
};
PropertiesPage.prototype._getUserProperties = function() {
    var properties = {};
    this.$userMetaTable.find( '.row' ).each( function() {
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
    var userProperties = {};
    jQuery.extend( userProperties, this._getUserProperties() );
    if ( userProperties.hasOwnProperty( tag ) ) {
        alert( this.templates.get( 'tagExists' ).render( {tag: tag} ) );
        return false;
    }
    if ( !this.util.validTag( tag ) ) {
        alert( this.templates.get( 'validNameError' ).render( {name: tag} ) );
        return false;
    }
    return true;
};
