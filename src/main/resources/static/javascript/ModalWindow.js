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
ModalWindow = function( title, $content, templateEngine, width ) {
    var requiredSelectors = [
        '.s3ModalWindowContent',
        '.s3XButton'
    ];
    this.$background = jQuery( templateEngine.get( 'modalBackground' ).render() );
    this.$window = jQuery( templateEngine.get( 'modalWindow' ).render( {title: title}, requiredSelectors ) );
    this.$content = this.$window.find( '.s3ModalWindowContent' );
    this.$closeButton = this.$window.find( '.s3XButton' );

    jQuery( 'body' ).append( this.$background ).append( this.$window );
    this.$content.empty();
    this.$content.append( $content );

    var modal = this;
    this.$closeButton[0].onclick = function() {
        modal.remove();
    };

    if ( !width ) width = 500;
    this.$window.width( width );
    this.$window.css( {top: '50%', left: '50%', margin: ('-' + (this.$window.height() / 2 + 20) + 'px 0 0 -' + (width / 2) + 'px')} );
};
ModalWindow.prototype.hideCloseButton = function() {
    this.$closeButton.hide();
};
ModalWindow.prototype.remove = function() {
    this.$background.remove();
    this.$window.remove();
};
