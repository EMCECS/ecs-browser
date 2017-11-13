/*
 * Copyright (c) 2011-2017, EMC Corporation. All rights reserved.
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
SharePage = function( entry, currentLocation,util, templateEngine, s3Info ) {
    this.entry = entry;
    this.util = util;
    var currentLocation=currentLocation;
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

    new ModalWindow( this.templates.get( 'sharePageTitle' ).render( {name: entry.name || entry.id} ), $sharePage, this.templates );

    var page = this;
    if ( $addAllowButton.length > 0 ) $addAllowButton[0].onclick = function() {
        page.addIp( $allowTable );
    };
    if ( $addDenyButton.length > 0 ) $addDenyButton[0].onclick = function() {
        page.addIp( $denyTable );
    };
    $generateButton[0].onclick = function() {
        var date = page.util.futureDate( $expirationCount.val(), $expirationUnit.val() );
        if ( $downloadCount.val().length > 0
            || $allowTable.find( '.row' ).length > 0
            || $denyTable.find( '.row' ).length > 0 ) { // need to create an access token for these features
            var policy = new AccessTokenPolicy( date, null, parseInt( $downloadCount.val() ), [], [] );
            $allowTable.find( '.row' ).each( function() {
                policy.sourceAllowList.push( jQuery( this ).find( '.s3IpSubnet' ).val() );
            } );
            $denyTable.find( '.row' ).each( function() {
                policy.sourceDenyList.push( jQuery( this ).find( '.s3IpSubnet' ).val() );
            } );
            page.util.createAccessToken( policy, entry.id, function( tokenUrl ) {
                $shareUrl.text( tokenUrl );
                $shareUrl.selectText();
            } )

        } else { // just use a shareable URL
        	var bucketName=currentLocation.split("/");
        	
            $shareUrl.text( page.util.getShareableUrl( entry.prefixKey,bucketName[1], date ) );
            $shareUrl.selectText();
        }
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