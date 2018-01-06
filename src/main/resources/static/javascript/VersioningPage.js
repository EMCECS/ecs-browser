/*
 * Copyright 2017 EMC Corporation. All Rights Reserved.
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
VersioningPage = function( entry, versioning, util, templateEngine ) {
    this.util = util;
    this.templates = templateEngine;
    if ( !versioning.status ) {
        versioning.status = '';
    }

    this.$root = jQuery( templateEngine.get( 'versioningPage' ).render( {}, ['.s3VersioningStatus', '.s3SaveButton', '.s3CancelButton'] ) );

    var modalWindow = new ModalWindow( templateEngine.get( 'versioningPageTitle' ).render( {name: entry.name || entry.id} ), this.$root, templateEngine );

    var page = this;

    this.$root.find( '.s3SaveButton' )[0].onclick = function() {
        versioning.status = page.$root.find( '.s3VersioningStatus' ).val();
        page.util.setVersioning( entry, versioning, function() {
            modalWindow.remove();
        } );
    };

    this.$root.find( '.s3CancelButton' )[0].onclick = function() {
        modalWindow.remove();
    };
};

