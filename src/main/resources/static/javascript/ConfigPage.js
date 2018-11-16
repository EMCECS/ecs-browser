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
ConfigPage = function( templateEngine, callback, showCloseButton ) {
    this.templates = templateEngine;
    this.callback = callback;
    this.$root = jQuery( this.templates.get( 'configPage' ).render( {}, ['.s3UidTable', '.s3AddButton'] ) );
    this.$uidTable = this.$root.find( '.s3UidTable' ).empty();
    var $addButton = this.$root.find( '.s3AddButton' );
    var $closeButton = this.$root.find( '.s3CloseButton' );

    this.loadConfiguration();

    this.modalWindow = new ModalWindow( this.templates.get( 'configPageTitle' ).render(), this.$root, this.templates, 525 );
    if ( arguments.length > 2 && !showCloseButton ) {
        $closeButton.hide();
        this.modalWindow.hideCloseButton();
    }

    var page = this;
    if ( $addButton.length > 0 ) $addButton[0].onclick = function() {
        page.showUidPage();
    };
    if ( $closeButton.length > 0 ) $closeButton[0].onclick = function() {
        page.modalWindow.remove();
    };
};
/** If possible, use the HTML5 storage API to hold active token */
ConfigPage.loadActiveToken = function() {
    var token = null;
    console.trace();
    if ( window.localStorage ) {
        var uid = window.localStorage.getItem( 'uid' );
        var secretC = window.localStorage.getItem( 'secret' );
        var endpoint = window.localStorage.getItem( 'endpoint' );
        // var secretC=Crypto.AES.encrypt( window.localStorage.getItem( 'secret' ), S3Browser.k );
        if ( uid && secretC && endpoint ) token = {uid: uid, secret: secretC, endpoint: endpoint};
    }
    return token;
};
/** If possible, use the HTML5 storage API to hold active token */
ConfigPage.saveActiveToken = function( token ) {
    if ( window.localStorage ) {
        try {
            window.localStorage.setItem( 'uid', token.uid );
            window.localStorage.setItem( 'secret', token.secret);
            window.localStorage.setItem( 'endpoint', token.endpoint);
        } catch ( error ) {
            alert( this.templates.get( 'storageDisabledPrompt' ).render() );
        }
    }
};
ConfigPage.deleteActiveToken = function( token ) {
    if ( window.localStorage ) {
        if ( !token || window.localStorage.getItem( 'uid' ) == token.uid ) {
            try {
                window.localStorage.removeItem( 'uid' );
                window.localStorage.removeItem( 'secret' );
                window.localStorage.removeItem( 'endpoint' );
            } catch ( error ) {
                alert( this.templates.get( 'storageDisabledPrompt' ).render() );
            }
        }
    }
};
/** If possible, use the HTML5 storage API to hold configuration */
ConfigPage.prototype.loadConfiguration = function() {
    if ( window.localStorage ) {
        var page = this;
        var configuration;
        try {
            configuration = JSON.parse( window.localStorage.getItem( 'configuration' ) || '{}' );
        } catch ( error ) {
            alert( this.templates.get( 'configDataCorruptPrompt' ).render() );
        }
        if ( configuration && configuration.uids ) {
            configuration.uids.forEach( function( token ) {
                page.addUid( {uid: token.uid, secret: token.secret, endpoint: token.endpoint} )
            } );
        } else { // import legacy settings
            var token = ConfigPage.loadActiveToken();
            if ( token ) {
                page.addUid( token );
                page.saveConfiguration();
            }
        }
    }
};
/** If possible, use the HTML5 storage API to hold configuration */
ConfigPage.prototype.saveConfiguration = function() {
    var configuration = {};
    configuration.uids = [];
    this.$uidTable.find( '.row' ).each( function() {
        var $this = jQuery( this );
        var uid = $this.find( '.s3Uid' ).text();
        var secret = $this.find( '.s3Secret' ).text();
        var endpoint = $this.find( '.s3Endpoint' ).text();
        configuration.uids.push( {uid: uid, secret: secret, endpoint: endpoint } );
    } );
    if ( window.localStorage ) {
        try {
            window.localStorage.setItem( 'configuration', JSON.stringify( configuration ) );
        } catch ( error ) {
            alert( this.templates.get( 'storageDisabledPrompt' ).render() );
        }
    }
};
ConfigPage.prototype.addUid = function( token ) {
    var $uidRow = jQuery( this.templates.get( 'uidRow' ).render( {token: token}, ['.s3Uid', '.s3Secret', '.s3Endpoint', '.s3LoginButton', '.s3DeleteButton'] ) );
    var $loginButton = $uidRow.find( '.s3LoginButton' );
    var $deleteButton = $uidRow.find( '.s3DeleteButton' );
    var page = this;
    $loginButton[0].onclick = function() {
        ConfigPage.saveActiveToken( token );
        page.modalWindow.remove();
        page.callback( token.uid, token.secret, token.endpoint );
    };
    $deleteButton[0].onclick = function() {
        if ( confirm( page.templates.get( 'deleteUidPrompt' ).render( {token: token} ) ) ) {
            $uidRow.remove();
            page.saveConfiguration();
            ConfigPage.deleteActiveToken( token );
        }
    };
    this.$uidTable.append( $uidRow );
};
ConfigPage.prototype.showUidPage = function() {
    var requiredSelectors = [
        'input.s3UidField',
        'input.s3SecretField',
        'input.s3EndpointField',
        '.s3SaveButton'
    ];
    var $uidRoot = jQuery( this.templates.get( 'uidPage' ).render( {}, requiredSelectors ) );
    var $uid = $uidRoot.find( '.s3UidField' );
    var $secret = $uidRoot.find( '.s3SecretField' );
    var $endpoint = $uidRoot.find( '.s3EndpointField' );
    var $testButton = $uidRoot.find( '.s3TestButton' );
    var $saveButton = $uidRoot.find( '.s3SaveButton' );
    var $cancelButton = $uidRoot.find( '.s3CancelButton' );

    var modalWindow = new ModalWindow( this.templates.get( 'uidPageTitle' ).render(), $uidRoot, this.templates );
    modalWindow.hideCloseButton();

    var page = this;
    if ( $testButton.length > 0 ) $testButton[0].onclick = function() {
        var s3 = new EcsS3({endpoint: $endpoint.val(), accessKeyId: $uid.val(),secretAccessKey:  $secret.val(), s3ForcePathStyle: true});
        s3.getServiceInformation( function( result ) {
            var messageKey;
            if ( result && result.successful ) {
                messageKey = 'uidSuccessPrompt';
            } else {
                messageKey = 'uidFailurePrompt';
            }
            alert( page.templates.get( messageKey ).render() );
        } );
    };
    $saveButton[0].onclick = function() {
        page.addUid( { uid: $uid.val(), secret: $secret.val(), endpoint: $endpoint.val()} );
        page.saveConfiguration();
        modalWindow.remove();
    };
    if ( $cancelButton.length > 0 ) $cancelButton[0].onclick = function() {
        modalWindow.remove();
    };

    $uid.focus();
};
