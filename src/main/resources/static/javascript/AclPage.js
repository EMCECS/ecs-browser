/*
 * Copyright 2011-2017 EMC Corporation. All Rights Reserved.
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
AclPage = function( entry, acl, util, templateEngine ) {
    this.util = util;
    this.templates = templateEngine;
    this.$root = jQuery( templateEngine.get( 'aclPage' ).render( {}, ['.s3UserAclTable', '.s3GroupAclTable', '.s3AddUserAclButton', '.s3AddGroupAclButton', '.s3SaveButton', '.s3CancelButton'] ) );
    this.$userAclTable = this.$root.find( '.s3UserAclTable' ).empty();
    this.$groupAclTable = this.$root.find( '.s3GroupAclTable' ).empty();

    for ( i = 0; i < acl.grants.length ; i++ ) {
        var grant = acl.grants[i];
        if ( grant.grantee.uri ) {
            this.addAclEntry( this.$groupAclTable, grant.grantee.uri, grant.permission );
        } else {
            this.addAclEntry( this.$userAclTable, grant.grantee.id, grant.permission );
        }
    }

    var modalWindow = new ModalWindow( templateEngine.get( 'aclPageTitle' ).render( entry ), this.$root, templateEngine );

    var page = this;

    this.$root.find( '.s3AddUserAclButton' )[0].onclick = function() {
        var name = page.util.prompt( 'userAclNamePrompt', {}, page.util.validName, 'validNameError' );
        if ( name == null || name.length == 0 ) return;
        page.addAclEntry( page.$userAclTable, name );
    };

    this.$root.find( '.s3AddGroupAclButton' )[0].onclick = function() {
        var uri = page.util.prompt( 'groupAclUriPrompt', {}, page.util.validName, 'validNameError' );
        if ( uri == null || uri.length == 0 ) return;
        page.addAclEntry( page.$groupAclTable, name );
    };

    this.$root.find( '.s3SaveButton' )[0].onclick = function() {
        var newAcl = {
            grants: [],
            owner: acl.owner
        };
        page.$userAclTable.find( '.row' ).each( function() {
            var $this = jQuery( this );
            var name = $this.find( '.s3AclName' ).text();
            var permission = $this.find( '.s3AclValue:checked' ).val();
            newAcl.grants.push( new AclEntry( name, null, permission ) );
        } );
        page.$groupAclTable.find( '.row' ).each( function() {
            var $this = jQuery( this );
            var name = $this.find( '.s3AclName' ).text();
            var permission = $this.find( '.s3AclValue:checked' ).val();
            newAcl.grants.push( new AclEntry( null, name, permission ) );
        } );
        page.util.setAcl( entry, newAcl, function() {
            modalWindow.remove();
        } );
    };

    this.$root.find( '.s3CancelButton' )[0].onclick = function() {
        modalWindow.remove();
    };
};

AclPage.prototype.addAclEntry = function( $table, name, access ) {
    if ( !access ) access = 'NONE';
    var $row = jQuery( this.templates.get( 'aclRow' ).render( {name: name} ) );
    $row.find( 'input[value="' + access + '"]' ).prop( 'checked', true );
    $table.append( $row );
};

AclEntry = function ( id, uri, permission ) {
    this.permission = permission;
    this.grantee = {
        id: id,
        type: id ? "CanonicalUser" : "Group",
        uri: uri
    };
};

AclEntry.ACL_PERMISSIONS = {
    READ: "READ",
    WRITE: "WRITE",
    FULL_CONTROL: "FULL_CONTROL",
    NONE: "NONE"
};

