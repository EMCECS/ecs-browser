/*
 * Copyright 2011-2018 Dell Inc. or its subsidiaries. All rights reserved.
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
ContextMenu = function( entry, browser ) {
    var templateName = browser.util.isTag( entry.type ) ? 'tagContextMenu' : browser.util.isDirectory( entry.type ) ? 'directoryContextMenu' : 'fileContextMenu';
    this.$root = jQuery( browser.templates.get( templateName ).render() ).addClass( 'S3_contextMenu' ); // flag for removal
    jQuery( 'body' ).append( this.$root );

    var menu = this;
    var $openOption = this.$root.find( '.openOption' ).addClass( 'S3_contextMenuOption' ); // flag for recognition
    var $downloadOption = this.$root.find( '.downloadOption' ).addClass( 'S3_contextMenuOption' );
    var $deleteOption = this.$root.find( '.deleteOption' ).addClass( 'S3_contextMenuOption' );
    var $renameOption = this.$root.find( '.renameOption' ).addClass( 'S3_contextMenuOption' );
    var $moveOption = this.$root.find( '.moveOption' ).addClass( 'S3_contextMenuOption' );
    var $shareOption = this.$root.find( '.shareOption' ).addClass( 'S3_contextMenuOption' );
    var $propertiesOption = this.$root.find( '.propertiesOption' ).addClass( 'S3_contextMenuOption' );
    var $aclOption = this.$root.find( '.aclOption' ).addClass( 'S3_contextMenuOption' );
    var $infoOption = this.$root.find( '.infoOption' ).addClass( 'S3_contextMenuOption' );
    var $versionsOption = this.$root.find( '.versionsOption' ).addClass( 'S3_contextMenuOption' );

    if ( $openOption.length > 0 ) $openOption[0].onclick = function() {
        browser.openSelectedItems();
        menu.$root.remove();
    };
    if ( $downloadOption.length > 0 ) $downloadOption[0].onclick = function() {
        browser.downloadSelectedItems();
        menu.$root.remove();
    };
    if ( $deleteOption.length > 0 ) $deleteOption[0].onclick = function() {
        browser.deleteSelectedItems();
        menu.$root.remove();
    };
    if ( $renameOption.length > 0 ) $renameOption[0].onclick = function() {
        browser.renameEntry( entry );
        menu.$root.remove();
    };
    if ( $moveOption.length > 0 ) $moveOption[0].onclick = function() {
        browser.moveSelectedItems();
        menu.$root.remove();
    };
    if ( $shareOption.length > 0 ) $shareOption[0].onclick = function() {
        browser.shareEntry( entry );
        menu.$root.remove();
    };
    if ( $propertiesOption.length > 0 ) $propertiesOption[0].onclick = function() {
        browser.showProperties( entry );
        menu.$root.remove();
    };
    if ( $aclOption.length > 0 ) $aclOption[0].onclick = function() {
        browser.showAcl( entry );
        menu.$root.remove();
    };
    if ( $infoOption.length > 0 ) $infoOption[0].onclick = function() {
        browser.showObjectInfo( entry );
        menu.$root.remove();
    };
    if ( $versionsOption.length > 0 ) $versionsOption[0].onclick = function() {
        browser.showVersions( entry );
        menu.$root.remove();
    };
};
ContextMenu.prototype.moveTo = function( x, y ) {
    this.$root.css( "left", x + "px" );
    this.$root.css( "top", y + "px" );
};

jQuery( document ).mousedown( function( event ) {
    if ( !jQuery( event.target ).hasClass( 'S3_contextMenuOption' ) ) jQuery( '.S3_contextMenu' ).remove();
} );
