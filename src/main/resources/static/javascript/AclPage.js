/*

 Copyright (c) 2011-2017, EMC Corporation

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
AclPage = function( entry, acl, util, templateEngine ) {
    this.util = util;
    this.templates = templateEngine;
    this.$root = jQuery( templateEngine.get( 'aclPage' ).render( {}, ['.s3UserAclTable', '.s3GroupAclTable', '.s3AddUserAclButton', '.s3SaveButton', '.s3CancelButton'] ) );
    this.$userAclTable = this.$root.find( '.s3UserAclTable' ).empty();
    this.$groupAclTable = this.$root.find( '.s3GroupAclTable' );

    var entries=acl.grants;
    var userEntries=[];
    var groupEntries=[];

    for (i=0;i<entries.length;i++) {
        if (entries[i].grantee.uri) {
            groupEntries.push(entries[i]);
        } else {
            userEntries.push(entries[i]);
        }
    }
    // var userEntries = acl.userEntries, groupEntries = acl.groupEntries, i;
    for ( i = 0; i < userEntries.length; i++ ) {
        this.addAclEntry( this.$userAclTable, userEntries[i].grantee.id, userEntries[i].permission );
    }

    if ( groupEntries.length > 0 ) {
        var access = groupEntries[0].value;
        this.$groupAclTable.find( 'input[value="' + access + '"]' ).prop( 'checked', true );
    }

    var modalWindow = new ModalWindow( templateEngine.get( 'aclPageTitle' ).render( {name: entry.name || entry.id} ), this.$root, templateEngine );

    var page = this;

    this.$root.find( '.s3AddUserAclButton' )[0].onclick = function() {
        var name = page.util.prompt( 'userAclNamePrompt', {}, page.util.validName, 'validNameError' );
        if ( name == null || name.length == 0 ) return;
        page.addAclEntry( page.$userAclTable, name );
    };

    this.$root.find( '.s3SaveButton' )[0].onclick = function() {
        acl.userEntries = page.getAclEntries( page.$userAclTable );
        acl.groupEntries = page.getAclEntries( page.$groupAclTable );
        page.util.setAcl( entry.prefixKey, acl, function() {
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

AclPage.prototype.getAclEntries = function( $table ) {
    var entries = [];
    $table.find( '.row' ).each( function() {
        var $this = jQuery( this );
        var name = $this.find( '.s3AclName' ).text();
        var access = $this.find( '.s3AclValue:checked' ).val();
        entries.push( new AclEntry( name, access ) );
    } );
    return entries;
};
