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
S3Template = function( name, content, engine ) {
    this.name = name;
    this.content = content.trim();
    this.engine = engine;
};
/**
 * Renderer for templates. Provides a velocity-like parser for strings.
 * @param {Object} model the model from which to pull values for replacing tags/variables
 * @param {Array.<String>} requiredSelectors (optional) an array of jQuery selectors that are expected to be present in this
 * template. An error will be thrown if any of these selectors are absent. Good for debugging custom HTML.
 */
S3Template.prototype.render = function( model, requiredSelectors ) {
    if ( requiredSelectors ) {
        var $content = jQuery( this.content );
        var missingSelectors = [];
        for ( var j = 0; j < requiredSelectors.length; j++ ) {
            if ( $content.find( requiredSelectors[j] ).length == 0 ) missingSelectors.push( requiredSelectors[j] );
        }
        if ( missingSelectors.length > 0 ) throw "Template " + this.name + " is missing required selectors: " + missingSelectors.join( ", " );
    }

    var result = this.content;

    // required tags (i.e. "%{tagName}") will be retained in the output if unresolvable
    var tags = this.content.match( /%\{[^}]+\}/g );
    if ( tags && !model ) throw "Template " + this.name + " contains required tags, but no model was specified";
    if ( tags ) result = this._replaceTags( result, tags, model, true );

    // optional tags (i.e. "${tagName}") will be removed from the output
    tags = this.content.match( /\$\{[^}]+\}/g );
    if ( tags ) result = this._replaceTags( result, tags, model, false );

    // date tags (i.e. "D{tagName}") will be parsed and formatted to the client's locale. date tags are optional (removed)
    tags = this.content.match( /D\{[^}]+\}/g );
    if ( tags ) result = this._replaceTags( result, tags, model, false, function( value ) {
        return S3Template.parseIso8601Date( value ).toLocaleString();
    } );

    return result;
};
S3Template.prototype._replaceTags = function( sourceString, tagArray, model, retainUnresolvableTags, formatFunction ) {
    var remaining = sourceString;
    var complete = '';
    for ( var i = 0; i < tagArray.length; i++ ) {
        var tag = tagArray[i];
        var tagName = tag.substr( 2, tag.length - 3 );
        var tagStart = remaining.indexOf( tag );
        var tagValue;
        try {
            tagValue = model[tagName];
            if ( !tagValue ) {
                var propPath = tagName.split( "." ), prop = model;
                for ( var j = 0; j < propPath.length; j++ ) {
                    prop = prop[propPath[j]];
                }
                tagValue = prop;
            }
        } catch ( e ) {
            tagValue = false; // the value isn't in the model (this might be ok)
        }
        if ( tagValue ) {
            if ( formatFunction ) tagValue = formatFunction( tagValue );
            complete += remaining.substr( 0, tagStart ) + tagValue;
        } else {
            // check for a sub-template
            try {
                complete += remaining.substr( 0, tagStart ) + this.engine.get( tagName ).render( model );
            } catch ( error ) { // tag is unresolvable
                this._debug( "In template " + this.name + ", tag " + tagName + " not found in model or templates (" + error + ")" );
                complete += remaining.substr( 0, tagStart );
                if ( retainUnresolvableTags ) complete += tag;
            }
        }
        remaining = remaining.substr( tagStart + tag.length );
    }
    complete += remaining;

    return complete;
};
S3Template.prototype._debug = function( message ) {
    if ( typeof(console) !== 'undefined' ) {
        if ( typeof(console.debug) !== 'undefined' ) {
            console.debug( message );
        } else if ( typeof(console.log) !== 'undefined' ) {
            console.log( message );
        }
    }
};

S3Template.parseIso8601Date = function( text ) {
    var iso8601RE = /^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2}):([0-9]{2})(?:\.[0-9]{3})?(?:([+-][0-9]{2})([0-9]{2})|Z)$/;
    var match = iso8601RE.exec( text ), date;
    if ( match ) {
        var year = parseInt( match[1] ), month = parseInt( match[2] ) - 1, day = parseInt( match[3] );
        var hour = parseInt( match[4] ), min = parseInt( match[5] ), sec = parseInt( match[6] );
        var hourOffset = 0, minuteOffset = 0;
        if ( match[7] ) {
            hourOffset = -parseInt( match[7] );
            minuteOffset = parseInt( match[8] );
        }
        date = new Date();
        date.setUTCFullYear( year, month, day );
        date.setUTCHours( hour + hourOffset, min + minuteOffset, sec, 0 );
    } else {
        date = new Date( text );
        date.setMilliseconds( 0 );
    }
    return date;
};