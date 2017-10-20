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