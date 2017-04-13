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
DirectoryPage = function( util, startPath, templateEngine, callback ) {
    this.util = util;
    this.templates = templateEngine;
    this.$root = jQuery( this.templates.get( 'directoryPage' ).render( {}, ['.s3DirectoryDisplay', '.s3DirectoryList'] ) );
    this.$display = this.$root.find( '.s3DirectoryDisplay' );
    this.$list = this.$root.find( '.s3DirectoryList' ).empty();
    this.$selectedDisplay = this.$root.find( '.s3SelectedDisplay' );

    var $upButton = this.$root.find( '.s3UpButton' );
    var $createButton = this.$root.find( '.s3CreateButton' );
    var $selectButton = this.$root.find( '.s3SelectButton' );
    var $cancelButton = this.$root.find( '.s3CancelButton' );

    var modalWindow = new ModalWindow( templateEngine.get( 'directoryPageTitle' ).render(), this.$root, templateEngine, 400 );

    var page = this;
    if ( $upButton.length > 0 ) $upButton[0].onclick = function() {
        page.goTo( util.parentDirectory( page.currentPath ) );
    };
    if ( $createButton.length > 0 ) $createButton[0].onclick = function() {
        util.createDirectory( page.currentPath, function( name ) {
            page.addDirectory( name );
        } );
    };
    if ( $selectButton.length > 0 ) $selectButton[0].onclick = function() {
        modalWindow.remove();
        callback( page.selectedPath );
    };
    if ( $cancelButton.length > 0 ) $cancelButton[0].onclick = function() {
        modalWindow.remove();
        callback( null );
    };


    this.goTo( startPath );
};
DirectoryPage.prototype.goTo = function( path ) {
	console.trace();
    path = this.util.endWithSlash( path );
    var page = this;
    this.util.list( path, false, function( contents ) {
        page.$list.empty();
        for ( var i = 0; i < contents.length; i++ ) {
           
            if ( page.util.isDirectory(contents[i].type ) ) {
                page.addDirectory( contents[i].name );
            }
        }
        page.currentPath = path;
        page.selectedPath = path;
        page.$display.text( path );
        page.$selectedDisplay.text( path );
    } );
};
// adds a directory to the list in the UI. uses insert-sort
DirectoryPage.prototype.addDirectory = function( name ) {
    var $item = jQuery( this.templates.get( 'directoryItem' ).render( {name: name} ) );
    var page = this;
    $item[0].onmousedown = function() {
        $item.parent().find( '.selected' ).removeClass( 'selected' );
        $item.addClass( 'selected' );
        page.selectedPath = page.util.endWithSlash( page.currentPath + name );
        page.$selectedDisplay.text( page.selectedPath );
    };
    $item[0].ondblclick = function() {
        page.goTo( page.currentPath + name );
    };
    var $nextItem = null;
    this.$list.children().each( function() {
        if ( $nextItem ) return;
        var $this = jQuery( this );
        var nextName = $this.find( '.s3DirectoryItem' ).text() || $this.text();
        if ( nextName > name ) $nextItem = this;
    } );
    if ( $nextItem ) $item.insertBefore( $nextItem );
    else this.$list.append( $item );
};
