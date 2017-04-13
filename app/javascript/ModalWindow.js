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
