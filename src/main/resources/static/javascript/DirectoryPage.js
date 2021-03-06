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
DirectoryPage = function( entry, util, templateEngine, callback ) {
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

    this.currentEntry = entry;
    this.selectedEntry = entry;

    var page = this;
    if ( $upButton.length > 0 ) $upButton[0].onclick = function() {
        page.goTo( util.getParentEntry( page.currentEntry ) );
    };
    if ( $createButton.length > 0 ) $createButton[0].onclick = function() {
        util.createDirectory( page.currentEntry, function( name ) {
            page.addDirectory( name );
        } );
    };
    if ( $selectButton.length > 0 ) $selectButton[0].onclick = function() {
        modalWindow.remove();
        callback( page.selectedEntry );
    };
    if ( $cancelButton.length > 0 ) $cancelButton[0].onclick = function() {
        modalWindow.remove();
        callback( null );
    };

    this.goTo( entry );
};
DirectoryPage.prototype.goTo = function( entry ) {
    console.trace();
    var page = this;
    this.util.list( entry, false, function( contents ) {
        page.$list.empty();
        for ( var i = 0; i < contents.length; i++ ) {
            if ( page.util.isListable( contents[i].type ) ) {
                page.addDirectory( contents[i] );
            }
        }
        page.currentEntry = entry;
        page.$display.text( page.util.getLocationText( entry ) );
        page.setSelectedEntry( entry );
    } );
};
// adds a directory to the list in the UI. uses insert-sort
DirectoryPage.prototype.addDirectory = function( entry ) {
    var $item = jQuery( this.templates.get( 'directoryItem' ).render( entry ) );
    var page = this;
    $item[0].onmousedown = function() {
        $item.parent().find( '.selected' ).removeClass( 'selected' );
        $item.addClass( 'selected' );
        page.setSelectedEntry( entry );
    };
    $item[0].ondblclick = function() {
        page.goTo( entry );
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

DirectoryPage.prototype.setSelectedEntry = function( entry ) {
    this.selectedEntry = entry;
    this.$selectedDisplay.text( this.util.getLocationText( entry ) );
};
