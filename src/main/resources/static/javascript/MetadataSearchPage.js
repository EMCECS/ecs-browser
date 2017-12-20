/*
 * Copyright (c) 2017, EMC Corporation. All rights reserved.
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
MetadataSearchPage = function( browser ) {
    this.browser = browser;
    this.name = browser.currentLocation;
    this.templateEngine = browser.templates;
    var requiredSelectors = [
        '.s3ClearButton',
        '.s3ListButton',
        '.s3CancelButton'
    ];
    console.trace();
    this.$root = jQuery( this.templateEngine.get( 'metadataSearchPage' ).render( {}, requiredSelectors ) );
    this.modalWindow = new ModalWindow( this.templateEngine.get( 'metadataSearchPageTitle' ).render( { name: this.name } ), this.$root, this.templateEngine );
    this.$queryTable = this.$root.find('.s3QueryParameterTable');

    var page = this;
    var $clearButton = page.$root.find( '.s3ClearButton' );
    var $listButton = page.$root.find( '.s3ListButton' );
    var $cancelButton = page.$root.find( '.s3CancelButton' );
    page.clear();

    $clearButton[0].onclick = function() {
        page.clear();
    };

    $listButton[0].onclick = function() {
        page.list();
    };

    $cancelButton[0].onclick = function() {
        page.modalWindow.remove();
    };
};

MetadataSearchPage.prototype.clear = function() {
    var page = this;
    page.$queryTable.find( '.s3QueryParameterValue' ).each( function() {
        jQuery( this ).val('');
    } );
};

MetadataSearchPage.prototype.getMetadataSearchParameters = function() {
    var page = this;
    var metadataSearchParameters = '';
    var separator = '';
    page.$queryTable.find( '.s3QueryParameter' ).each( function() {
        $this = jQuery( this );
        var value = $this.find( '.s3QueryParameterValue' ).val();
        if (value) {
            metadataSearchParameters = metadataSearchParameters + separator + $this.find( '.s3QueryParameterName' ).text() + '=' + value;
            separator = '&';
        }
    } );
    if ( metadataSearchParameters.indexOf( 'query=' ) < 0 ) {
        metadataSearchParameters = '';
    }
    return metadataSearchParameters;
};

MetadataSearchPage.prototype.list = function() {
    var page = this;
    page.modalWindow.remove();
    page.browser.list( page.browser.currentLocation, page.getMetadataSearchParameters() );
};
