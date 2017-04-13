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
VersionsPage = function( entry, currentLocation, util, templateEngine ) {
    this.entry = entry;
    this.currentLocation = currentLocation;
    this.oid = entry.objectId || entry.id;
    this.util = util;
    this.templates = templateEngine;
    var requiredSelectors = [
        '.s3VersionTable',
        '.s3CreateButton',
        '.s3CloseButton'
    ];
    this.$root = jQuery( templateEngine.get( 'versionsPage' ).render( {}, requiredSelectors ) );
    var $createButton = this.$root.find( '.s3CreateButton' );
    this.$versionTable = this.$root.find( '.s3VersionTable' ).empty();
    var $closeButton = this.$root.find( '.s3CloseButton' );

    this.modalWindow = new ModalWindow( templateEngine.get( 'versionsPageTitle' ).render( {name: entry.name || entry.id} ), this.$root, templateEngine );

    this.refresh();

    var page = this;
    $createButton[0].onclick = function() {
        page.util.createVersion( page.oid, function() {
            page.refresh();
        } );
    };
    $closeButton[0].onclick = function() {
        page.modalWindow.remove();
    };
};
VersionsPage.prototype.refresh = function() {
    this.$versionTable.empty();
    var page = this;
    this.util.listVersions( this.oid, this.currentLocation, function( versions ) {
        versions.forEach( function( version ) {
            page.addVersion( version );
        } );
    } );
};
VersionsPage.prototype.addVersion = function( version ) {
    var $versionRow = jQuery( this.templates.get( 'versionRow' ).render( {version: version} ) );
    var $downloadButton = $versionRow.find( '.s3DownloadButton' );
    var $restoreButton = $versionRow.find( '.s3RestoreButton' );
    var $deleteButton = $versionRow.find( '.s3DeleteButton' );
    var page = this;
    if ( $downloadButton.length > 0 ) $downloadButton[0].onclick = function() {
        var versionName = (page.entry.name || page.entry.id) + ' at ' + version.dateCreated.toLocaleString();
        page.util.downloadFile( version.oid, 0, versionName );
    };
    if ( $restoreButton.length > 0 ) $restoreButton[0].onclick = function() {
        if ( confirm( page.templates.get( 'restoreVersionPrompt' ).render( {version: version} ) ) ) {
            page.util.restoreVersion( page.oid, version.oid, function() {
                alert( page.templates.get( 'restoreVersionSuccessPrompt' ).render( {version: version} ) );
            } );
        }
    };
    if ( $deleteButton.length > 0 ) $deleteButton[0].onclick = function() {
        if ( confirm( page.templates.get( 'deleteVersionPrompt' ).render( {version: version} ) ) ) {
            page.util.deleteVersion( version.oid, function() {
                $versionRow.remove();
            } );
        }
    };
    this.$versionTable.append( $versionRow );
};
