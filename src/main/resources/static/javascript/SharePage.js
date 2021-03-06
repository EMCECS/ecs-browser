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
SharePage = function( entry, util, templateEngine, s3Info ) {
    this.entry = entry;
    this.util = util;
    this.templates = templateEngine;
    var requiredSelectors = ['input.s3ExpirationCount', 'select.s3ExpirationUnit', '.s3ShareUrl', '.s3GenerateButton'];
    var $sharePage = jQuery( this.templates.get( 'sharePage' ).render( {}, requiredSelectors ) );
    var $expirationCount = $sharePage.find( 'input.s3ExpirationCount' );
    var $expirationUnit = $sharePage.find( 'select.s3ExpirationUnit' );
    var $downloadCount = $sharePage.find( '.s3DownloadCount' );
    var $allowTable = $sharePage.find( '.s3AllowTable' );
    var $addAllowButton = $sharePage.find( '.s3AddAllowButton' );
    var $denyTable = $sharePage.find( '.s3DenyTable' );
    var $addDenyButton = $sharePage.find( '.s3AddDenyButton' );
    var $shareUrl = $sharePage.find( '.s3ShareUrl' );
    var $generateButton = $sharePage.find( '.s3GenerateButton' );

//    if ( '2.1'.localeCompare( s3Info.version ) < 0 ) $sharePage.find( '.s3TokenFeature' ).show();

    new ModalWindow( this.templates.get( 'sharePageTitle' ).render( entry ), $sharePage, this.templates );

    var page = this;
    if ( $addAllowButton.length > 0 ) $addAllowButton[0].onclick = function() {
        page.addIp( $allowTable );
    };
    if ( $addDenyButton.length > 0 ) $addDenyButton[0].onclick = function() {
        page.addIp( $denyTable );
    };
    $generateButton[0].onclick = function() {
        var date = page.util.futureDate( $expirationCount.val(), $expirationUnit.val() );
        page.util.getShareableUrl( entry, date, function( data ) {
            $shareUrl.text( data );
            $shareUrl.selectText();
        });
    };
};
SharePage.prototype.addIp = function( $table ) {
    var $row = jQuery( this.templates.get( 'ipRow' ).render( {}, ['.s3DeleteButton'] ) );
    var $deleteButton = $row.find( '.s3DeleteButton' );
    $deleteButton[0].onclick = function() {
        $row.remove();
    };
    $table.append( $row );
};