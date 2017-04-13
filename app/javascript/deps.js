// Select Text plug-in (http://jsfiddle.net/edelman/KcX6A/94/)
jQuery.fn.selectText = function() {
    var element = this[0];
    var range = null;
    if ( document.body.createTextRange ) {
        range = document.body.createTextRange();
        range.moveToElementText( element );
        range.select();
    } else if ( window.getSelection ) {
        var selection = window.getSelection();
        if ( selection.setBaseAndExtent ) {
            selection.setBaseAndExtent( element, 0, element, 1 );
        } else {
            range = document.createRange();
            range.selectNodeContents( element );
            selection.removeAllRanges();
            selection.addRange( range );
        }
    }
};

// Plug-in to detect scroll bar width (necessary for layouts)
jQuery.scrollbarWidth = function() {
    if ( !jQuery._scrollbarWidth ) {
        var $temp = jQuery( '<div />' ).css( {position: 'absolute', left: '-200px', top: '0', width: '100px', height: '100px', 'overflow-y': 'scroll', 'background-color': 'red'} );
        var $inner = jQuery( '<div />' ).css( {width: '100%', height: '50px', 'background-color': 'red'} );
        $temp.append( $inner );
        jQuery( 'body' ).append( $temp );
        jQuery._scrollbarWidth = $temp.width() - $inner.width();
        $temp.remove();
    }
    return jQuery._scrollbarWidth;
};

// Plug-in to alter CSS rules
jQuery.cssRule = function( selector, property, value ) {
    var ss, rules, newRule = true;
    for ( var i = 0; i < document.styleSheets.length; i++ ) {
        ss = document.styleSheets[i];
        rules = (ss.cssRules || ss.rules);
        if ( !rules ) continue; // stylesheet has no rules (this sometimes happens in Chrome)
        var lsel = selector.toLowerCase();

        for ( var i2 = 0, len = rules.length; i2 < len; i2++ ) {
            if ( rules[i2].selectorText && (rules[i2].selectorText.toLowerCase() == lsel) ) {
                newRule = false;
                if ( value != null ) {
                    rules[i2].style[property] = value;
                    return;
                }
                else {
                    if ( ss.deleteRule ) {
                        ss.deleteRule( i2 );
                    }
                    else if ( ss.removeRule ) {
                        ss.removeRule( i2 );
                    }
                    else {
                        rules[i2].style.cssText = '';
                    }
                }
            }
        }
    }

    if ( newRule ) {
        ss = document.styleSheets[0] || {};
        if ( ss.insertRule ) {
            rules = (ss.cssRules || ss.rules);
            ss.insertRule( selector + '{ ' + property + ':' + value + '; }', rules.length );
        }
        else if ( ss.addRule ) {
            ss.addRule( selector, property + ':' + value + ';' );
        }
    }
};

// Plug-in to return outer HTML of an element (necessary for FireFox)
jQuery.fn.outerHTML = function( replacement ) {
    if ( replacement ) return this.replaceWith( replacement );
    else if ( this.length == 0 ) return null;
    else {
        if ( this[0].outerHTML ) return this[0].outerHTML;
        else {
            var attributes = '';
            for ( var i = 0; i < this[0].attributes.length; i++ ) {
                attributes += ' ' + this[0].attributes[i].name + '="' + this[0].attributes[i].value + '"';
            }
            return '<' + this[0].tagName + attributes + '>' + this[0].innerHTML + '</' + this[0].tagName + '>';
        }
    }
};

/**
 * jQuery.fn.sortElements
 * --------------
 * @author James Padolsey (http://james.padolsey.com)
 * @version 0.11
 * @updated 18-MAR-2010
 * --------------
 * @param Function comparator:
 *   Exactly the same behaviour as [1,2,3].sort(comparator)
 *
 * @param Function getSortable
 *   A function that should return the element that is
 *   to be sorted. The comparator will run on the
 *   current collection, but you may want the actual
 *   resulting sort to occur on a parent or another
 *   associated element.
 *
 *   E.g. $('td').sortElements(comparator, function(){
 *      return this.parentNode;
 *   })
 *
 *   The <td>'s parent (<tr>) will be sorted instead
 *   of the <td> itself.
 */
jQuery.fn.sortElements = (function() {
    var sort = [].sort;
    return function( comparator, getSortable ) {
        getSortable = getSortable || function() {
            return this;
        };

        var placements = this.map( function() {

            var sortElement = getSortable.call( this ), parentNode = sortElement.parentNode, // Since the element itself will change position, we have
            // to have some way of storing it's original position in
            // the DOM. The easiest way is to have a 'flag' node:
                nextSibling = parentNode.insertBefore(
                    document.createTextNode( '' ),
                    sortElement.nextSibling
                );

            return function() {
                if ( parentNode === this ) {
                    throw new Error(
                        "You can't sort elements if any one is a descendant of another."
                    );
                }

                // Insert before flag:
                parentNode.insertBefore( this, nextSibling );
                // Remove flag:
                parentNode.removeChild( nextSibling );
            };
        } );

        return sort.call( this, comparator ).each( function( i ) {
            placements[i].call( getSortable.call( this ) );
        } );
    };
})();
