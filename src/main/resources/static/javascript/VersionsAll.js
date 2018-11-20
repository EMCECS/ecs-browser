/*
 * Copyright 2018 Dell Inc. or its subsidiaries. All rights reserved.
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
VersionsAll = function( entry, util, templateEngine ) {
    this.entry = entry;
    this.util = util;
    this.templates = templateEngine;
    var requiredSelectors = [
        '.s3VersionsAllTable',
        '.s3CloseButton'
    ];
    this.$root = jQuery( templateEngine.get( 'versionsAll' ).render( {}, requiredSelectors ) );
    this.$versionTable = this.$root.find( '.s3VersionsAllTable' ).empty();
    var $closeButton = this.$root.find( '.s3CloseButton' );

    this.modalWindow = new ModalWindow( templateEngine.get( 'versionsAllTitle' ).render( entry ), this.$root, templateEngine );

    this.refresh();

    var page = this;
    $closeButton[0].onclick = function() {
        page.modalWindow.remove();
    };
};

VersionsAll.prototype.refresh = function() {
    this.$versionTable.empty();
    var page = this;
    this.util.listVersions( this.entry, function( versions ) {
        for ( var i = 0; i < versions.length; ++i ) {
            if (versions[i].key != page.entry.key ) {
                page.addVersion( versions[i] );
            }
        }
    } );
};

VersionsAll.prototype.addVersion = function( version ) {
    version.deletion = isNonEmptyString( version.etag ) ? 'modified' : 'deleted';
    var $versionRow = jQuery( this.templates.get( 'versionsAllRow' ).render( { version: version } ) );
    var $downloadButton = $versionRow.find( '.s3DownloadButton' );
    var $restoreButton = $versionRow.find( '.s3RestoreButton' );
    var $deleteButton = $versionRow.find( '.s3DeleteButton' );
    if ( version.deletion === 'deleted' ) {
        $downloadButton.hide();
        $restoreButton.hide();
    }
    var page = this;
    var versionEntry = {
        bucket: page.entry.bucket,
        key: version.key,
        versionId: version.versionId
    };

    if ( $downloadButton.length > 0 ) $downloadButton[0].onclick = function() {
        page.util.downloadFile( versionEntry );
    };

    if ( $restoreButton.length > 0 ) $restoreButton[0].onclick = function() {
        if ( confirm( page.templates.get( 'restoreVersionPrompt' ).render( { version: version } ) ) ) {
            page.util.restoreVersion( versionEntry, function() {
                alert( page.templates.get( 'restoreVersionSuccessPrompt' ).render( { version: version } ) );
                page.refresh();
            } );
        }
    };

    if ( $deleteButton.length > 0 ) $deleteButton[0].onclick = function() {
        if ( confirm( page.templates.get( 'deleteVersionPrompt' ).render( { version: version } ) ) ) {
            page.util.deleteVersion( versionEntry, function() {
                $versionRow.remove();
            } );
        }
    };

    this.$versionTable.append( $versionRow );
};
