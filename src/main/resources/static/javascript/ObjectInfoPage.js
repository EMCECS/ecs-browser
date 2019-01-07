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
ObjectInfoPage = function( entry, objectInfo, templateEngine ) {
    this.templates = templateEngine;
    this.$root = jQuery( templateEngine.get( 'objectInfoPage' ).render( {objectInfo: objectInfo}, ['.s3ReplicaList'] ) );
    this.$replicaList = this.$root.find( '.s3ReplicaList' ).empty();

    if ( objectInfo.replicas ) {
        for ( var i = 0; i < objectInfo.replicas.length; i++ ) {
            this.addReplica( objectInfo.replicas[i] );
        }
    }

    var modalWindow = new ModalWindow( templateEngine.get( 'objectInfoPageTitle' ).render( entry ), this.$root, templateEngine );

    this.$root.find( '.s3CloseButton' )[0].onclick = function() {
        modalWindow.remove();
    }
};
ObjectInfoPage.prototype.addReplica = function( replica ) {
    var $replica = jQuery( this.templates.get( 'objectInfoReplica' ).render( {replica: replica} ) );
    this.$replicaList.append( $replica );
};
