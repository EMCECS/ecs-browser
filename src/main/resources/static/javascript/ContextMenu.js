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
