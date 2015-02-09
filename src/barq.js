/*!
 * @license MIT
 * @preserve
 *
 * Barq: client-side autocomplete
 * https://github.com/joaocunha/barq/
 *
 * @author João Cunha - joao@joaocunha.net - twitter.com/@joaocunha
 *
 * Thanks to all contributors, specially @bhappyz, @ghostavio, @kumailht and @gxx
 */

;(function(win, doc, undefined) {
    'use strict';

    // We declare the plugin as a globally accessible variable, so we
    // can instantiate outside the anonymous self-invoking function
    win.Barq = function(baseField, options) {
        // Just an alias for easier readability (and to preserve `this` context)
        var barq = this;

        // For extending the options in case the user passes the parameter
        var opts = options || {};

        // Stores the base field on the instance
        barq.baseField = baseField;

        barq.options = {
            /**
             * removeFirstOptionFromSearch
             * @type {Boolean}
             *
             * If true, removes the first option element from the search. Useful when
             * it's something like "<option>Select a value</option>"
             */
            removeFirstOptionFromSearch: opts.removeFirstOptionFromSearch || true,

            /**
             * useFirstOptionTextAsPlaceholder
             * @type {Boolean}
             *
             * If true, uses the first option as a placeholder for the autocomplete.
             */
            useFirstOptionTextAsPlaceholder: opts.useFirstOptionTextAsPlaceholder || true,

            /**
             * placeholderText
             * @type {null|String}
             *
             * Allows to set an arbitrary placeholder value, overriding first
             * option's text which is the default.
             */
            placeholderText: opts.placeholderText || null,

            /**
             * noResultsMessage
             * @type {String}
             *
             * Message to show when no matches are found on the search.
             */
            noResultsMessage: opts.noResultsMessage || 'No results found.',

            /**
             * isRTL
             * @type {Boolean}
             *
             * If true, adds a 'dir="rtl"' attribute to both the autocomplete input and the list.
             */
            isRTL: opts.isRTL || false,

            /**
             * onload
             * @type {Function}
             *
             * Callback called after instantiation, once.
             */
            onload: opts.onload || function() {},

            /**
             * onchange
             * @type {Function}
             *
             * Callback called everytime an item is selected from the list.
             */
            onchange: opts.onchange || function() {}
        };

        /**
         * classNames
         * @type {Object}
         *
         * Holds all the class selectors
         */
        var classNames = {
            // The <ul> element that holds all search results
            dropdownList: 'barq-list',

            // The text input to perform the searches on
            textInput: 'barq-text-input',

            // Vanity class to style the input when the list is currently being displayed
            textInputWithList: 'barq-input-text-expanded',

            // Utility class for hiding the list
            hidden: 'barq-hidden',

            // Utility class for showing the list
            visible: 'barq-visible',

            // Used for keyboard navigation
            activeItem: 'barq-active-item',

            // The item that shows no results
            noResults: 'barq-no-results',

            // Emphasizes a match on a search (like 'Heat<em class="barq-match">hro</em>w Airport')
            match: 'barq-match'
        };

        /**
         * KEYCODES
         * @type {Object}
         *
         * List of the navigation key codes we're interested at filtering.
         */
        var KEYCODES = {
            TAB: 9,
            ENTER: 13,
            SHIFT: 16,
            ESC: 27,
            END: 35,
            HOME: 36,
            LEFT: 37,
            UP: 38,
            RIGHT: 39,
            DOWN: 40,
            CMD: 91
        };

        /**
         * ERROR_MESSAGES
         * @type {Object}
         *
         * List of error messages for custom exception handling.
         */
        var ERROR_MESSAGES = {
            E_OPTION_NOT_FOUND: 'No <option> elements found.',
            E_BASE_FIELD_NOT_FOUND: 'Missing <select> element on instantiation.',
            E_ALREADY_INSTANTIATED: 'Instance already exists.'
        };

        // A few tiny crossbrowser DOM utilities so we can drop jQuery
        var utils = {
            addEventListener: function(el, eventName, handler) {
                if (el.addEventListener) {
                    el.addEventListener(eventName, handler);
                } else {
                    el.attachEvent('on' + eventName, handler);
                }
            },

            addClass: function(el, className) {
                if (el.classList) {
                    el.classList.add(className);
                } else {
                    el.className += ' ' + className;
                }
            },

            removeClass: function(el, className) {
                if (el.classList) {
                    el.classList.remove(className);
                } else {
                    var regex = new RegExp('(^|\\b)' + className.split(' ').join('|') + '(\\b|$)', 'gi');
                    el.className = el.className.replace(regex, ' ');
                }
            },

            getTextNode: function(node) {
                return (node && (node.innerText || node.textContent || node.innerHTML));
            },

            escapeString: function(text) {
                return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
            }
        };

        /**
         * @function init
         * Just a wrapper for initialization.
         *
         * @returns {Object} An instance of Barq itself, containing all public methods & properties.
         */
        barq.init = function() {

            // Check for the existance of the base field
            if (baseField.tagName.toUpperCase() !== 'SELECT') {
                throw new BarqException(ERROR_MESSAGES.E_BASE_FIELD_NOT_FOUND);
            }

            // Prevents doubling the instance in case it's supposed to be lazy loaded
            if (!baseField.getAttribute('data-barq-instantiated')) {
                baseField.setAttribute('data-barq-instantiated', 'true');
            } else {
                throw new BarqException(ERROR_MESSAGES.E_ALREADY_INSTANTIATED);
            }

            // Hides the base field ASAP, as it's gonna be replaced by the autocomplete text input.
            // We don't remove the base element as it holds the `name` attribute and values,
            // so it's useful in case of form submission.
            utils.addClass(barq.baseField, classNames.hidden);

            // Creates the main text input that's gonna be used as an autocomplete
            barq.textInput = createTextInput();

            // Creates the empty <ul> element to hold the list items
            barq.list = createEmptyList();

            // Extracts the items from the base field and stores them in memory as a string representation
            barq.itemsHTML = createItemsFromBaseField();

            // Fills the list element with the items
            populateListWithItems(barq.itemsHTML);

            // DOM representation of the items, useful for programatic selection
            barq.items = barq.list.childNodes;

            // Attaches all the event handlers
            setupEvents();

            // Sets an initial selection if there's a preselected value or option
            initialSelection();

            // onload user callback, passing barq as `this`
            barq.options.onload.call(barq);

            // Returns an instance of itself, so we can access from outside
            return barq;
        };

        /**
         * @function createTextInput
         * Creates the auto complete text input that replaces the original select element.
         *
         * @returns {HTMLInputElement} The newly-created text input
         */
        var createTextInput = function() {
            var input = doc.createElement('input');

            // Only one class ATM, no need for fancy pants .addClass()
            input.setAttribute('class', classNames.textInput);

            // Prevents some HTML5 trickery to mess with our stuff
            input.setAttribute('autocapitalize', 'off');
            input.setAttribute('autocomplete', 'off');
            input.setAttribute('autocorrect', 'off');
            input.setAttribute('spellcheck', 'false');

            // Adds RTL support, if needed
            if (barq.options.isRTL) {
                input.setAttribute('dir', 'rtl');
            }

            // Replicates the tabindex from the basefield...
            input.setAttribute('tabindex', barq.baseField.tabIndex);

            // ...and removes it from the basefield
            // See: http://stackoverflow.com/a/5192919/1411163
            barq.baseField.setAttribute('tabindex', '-1');

            // Checks for arbitrary text for the placeholder
            if (barq.options.placeholderText) {
                input.setAttribute('placeholder', barq.options.placeholderText);
            } else if (barq.options.useFirstOptionTextAsPlaceholder) {
                // If null (default), use the first <option> text from the baseField
                try {
                    var firstOptionText = utils.getTextNode(barq.baseField.options[0]);
                    input.setAttribute('placeholder', firstOptionText);
                } catch(e) {
                    throw new BarqException(ERROR_MESSAGES.E_OPTION_NOT_FOUND);
                }
            }

            // Insert the input field right after the base select element
            barq.baseField.insertAdjacentHTML('afterend', input.outerHTML);

            // We grab it back from the DOM, as insertAdjecentHTML doesn't return the inserted element
            return barq.baseField.nextElementSibling;
        };

        /**
         * @function initialSelection
         * Extends the "selected" property behavior to the autocomplete text input.
         *
         * @returns {HTMLOptionElement|Null} The pre-selected <option> element, or null
         */
        var initialSelection = function() {
            var option = barq.baseField.querySelector('[selected]');

            if (option) {
                barq.selectItem(option);
            }

            return option;
        };

        /**
         * @function BarqException
         * Basic exception handler.
         *
         * @param {String} message Error message to be displayed.
         */
        var BarqException = function(message) {
            this.message = message;
            this.name = 'BarqException';
            return;
        };

        // Extends the Error type
        BarqException.prototype = new Error();

        /**
         * @function createItemsFromBaseField
         * Extracts all the <option> elements from the baseField and replaces them
         * by <li> elements, building a string containing all <li> items.
         *
         * @returns {String} A list of <li> items stored in one long string
         */
        var createItemsFromBaseField = function() {

            // Removes the first option if needed (DOM is faster than regex in this case)
            if (barq.options.removeFirstOptionFromSearch) {
                try {
                    barq.baseField.removeChild(barq.baseField.options[0]);
                } catch(e) {
                    throw new BarqException(ERROR_MESSAGES.E_OPTION_NOT_FOUND);
                }
            }

            // Clean up comments and whitespace
            // TODO: mix these regexes if possible
            var items = barq.baseField.innerHTML.replace(/<!--([^\[|(<!)].*)/g, '')
                                                    .replace(/\s{2,}/g, '')
                                                    .replace(/(\r?\n)/g, '');

            // Transforms all the <option> elements in <li> elements.
            // The data-value attribute carries the original <option> value.
            var regex = /<option(?:[^>]*?value="([^"]*?)"|)[^>]*?>(.*?)<\/option>\n?/gi;
            var li = '<li data-value="$1">$2</li>';
            items = items.replace(regex, li);

            return items;
        };

        /**
         * @function showList
         * Shows the list element.
         */
        barq.showList = function() {
            // Shows the list
            utils.addClass(barq.list, classNames.visible);

            // Makes sure to position the list properly everytime it is shown
            barq.repositionList();

            // Adds a vanity class to the input
            utils.addClass(barq.textInput, classNames.textInputWithList);

            // Sets the first item as active, so we can start our navigation from there
            if (barq.list.firstChild.className !== classNames.noResults) {
                utils.addClass(barq.list.firstChild, classNames.activeItem);
            }
        };

        /**
         * @function hideList
         * Hides the list element.
         */
        barq.hideList = function() {
            // Hides the list
            utils.removeClass(barq.list, classNames.visible);

            // Removes the vanity class from the text input
            utils.removeClass(barq.textInput, classNames.textInputWithList);
        };

        /**
         * @function selectItem
         * Performs a list item selection (based on click or enter key, for example).
         *
         * @param {HTMLLIElement} item The item to base the scrolling on.
         */
        barq.selectItem = function(item) {
            var selectedText = utils.getTextNode(item);

            // Sets the selected item's text on the input
            barq.textInput.value = selectedText;

            // Stores the text on barq itself
            barq.text = selectedText;

            // Hides the list as we don't need it anymore
            barq.hideList();

            // Works for both <li> items and <option> items
            var val = item.getAttribute('data-value') ? item.getAttribute('data-value') : item.value;

            // Set the value back on the baseField
            barq.baseField.value = val;

            // Store the value on Barq itself
            barq.value = val;

            // onchange user callback
            barq.options.onchange.call(barq);
        };

        /**
         * @function createEmptyList
         * Creates an empty <ul> element and inserts it after the autocomplete input.
         *
         * @returns {HTMLUListElement} The <ul> element.
         */
        var createEmptyList = function() {
            var list = doc.createElement('ul');

            list.setAttribute('class', classNames.dropdownList);

            // Adds RTL support, if needed
            if (barq.options.isRTL) {
                list.setAttribute('dir', 'rtl');
            }

            // Insert the list right after the autocomplete input
            barq.textInput.insertAdjacentHTML('afterend', list.outerHTML);

            // We grab it back from the DOM, as insertAdjecentHTML doesn't return the inserted element
            return barq.textInput.nextElementSibling;
        };

        /**
         * @function populateListWithItems
         * Replaces the items on a list
         *
         * @param {String} data A string containing the <li> items that will replace the current ones.
         */
        var populateListWithItems = function(data) {
            barq.list.innerHTML = data;

            barq.currentItemsDOM = barq.list.childNodes;
        };

        /**
         * @function repositionList
         * Repositions and resizes the list when viewport size changes.
         * A good alternative would be tether.js but it weights ~5kb (more than Barq itself) :(
         */
        barq.repositionList = function() {
            var aboveInputOffset = barq.textInput.offsetTop;

            var belowInputOffset = Math.floor((barq.textInput.offsetTop + parseInt(barq.textInput.offsetHeight, 10)));

            var viewportHeight = win.innerHeight || doc.documentElement.clientHeight;

            var topPosition = 0;

            // Check if the list would be cut by the viewport
            if ((belowInputOffset + barq.list.offsetHeight) > viewportHeight) {
                // Show above
                topPosition = aboveInputOffset - barq.list.offsetHeight;
            } else {
                // Show below
                topPosition = belowInputOffset;
            }

            // Reposition the list accordingly
            barq.list.style.top = topPosition + 'px';
            barq.list.style.left = barq.textInput.offsetLeft + 'px';
            barq.list.style.width = barq.textInput.offsetWidth + 'px';
        };

        /**
         * @function search
         * Search for items based on a query. An empty query will return all items in the list.
         *
         * @param {String} [query] The search query to base the filtering against
         * @returns {String|Array} Either a long string or array with the matching items.
         */
        barq.search = function(query) {
            var matchingRegex = '';

            // We create a dynamic regex based on the search query, if any
            if (query !== '') {
                // Escape some special characters to prevent breaking the dynamic regex
                query = utils.escapeString(query);
                matchingRegex = new RegExp('<li[^>]*>[^<]*' + query + '[^<]*<\/li>', 'gi');
            } else {
                // Matches all list elements by default
                matchingRegex = /<li[^<]*<\/li>/gi;
            }

            var matches = barq.itemsHTML.match(matchingRegex) || [];

            if (matches.length) {
                // Joins the array of matches into a long HTML string containing all matching items
                matches = matches.join('');

                // Highlight the items in case there is a query
                if (query) {
                    matches = highlightMatches(query, matches);
                }

                // Populate the list with the matching items
                populateListWithItems(matches);

                // Sets an active class to the first item, to set a start to the keyboard navigation
                utils.addClass(barq.list.firstChild, classNames.activeItem);
            }

            return matches;
        };

        /**
         * @function highlightMatches
         * Highlights the matches on a search by encapsulating in an <em> tag.
         *
         * @param {String} query The search query to highlight
         * @param {Array} matches The array of matches to look through
         * @returns {String} An updated string with the matches (<li> items) encapsulates in <em> tags
         */
        var highlightMatches = function(query, matches) {
            // Escapes the string so we get rid of special characters
            query = utils.escapeString(query);

            var highlightRegex = new RegExp('(<li[^>]*>[^<]*)(' + query + ')([^<]*<\/li>)', 'gi');
            var formattedMatch = '$1<em class="' + classNames.match + '">$2</em>$3';

            return matches.replace(highlightRegex, formattedMatch);
        };

        /**
         * @function noResultsFound
         * Creates an <li> item containing a "no results" message and inserts it into the list.
         */
        var noResultsFound = function() {
            // A bit lame for templating, I know, but it's the only place needed
            var template = '<li class="0">1</li>';
            var item = template.replace('0', classNames.noResults)
                               .replace('1', barq.options.noResultsMessage);

            populateListWithItems(item);
        };

        /**
         * @function getActiveListItem
         * Gets the active list item. Used on keyboard navigation.
         *
         * @returns {HTMLLIElement}
         */
        barq.getActiveListItem = function() {
            return barq.list.querySelector('.' + classNames.activeItem);
        };

        /**
         * @function keyboardNavigate
         * Navigates up and down through the list, so we can select an item using a keyboard only.
         *
         * @param {Integer} keyPressed The key pressed, either UP (38) or DOWN (40)
         */
        var keyboardNavigate = function(keyPressed) {
            // The stored search results
            var items = barq.currentItemsDOM;

            // No need to navigate if there's only one item in the list
            if (items.length <= 1) {
                return;
            }

            // Stores the currently active item
            var activeItem = barq.getActiveListItem();

            // Next item in line to be activated
            var itemToActivate;

            // Prevent looping from first to last / last to first
            if (keyPressed === KEYCODES.UP) {
                // Actives the previous item only if it's not the first item of the list
                if (activeItem.previousElementSibling) {
                    itemToActivate = activeItem.previousElementSibling;
                }
            } else {
                // Don't activate the next item if it's the last one
                if (activeItem.nextElementSibling) {
                    itemToActivate = activeItem.nextElementSibling;
                }
            }

            if (itemToActivate) {
                // Removes the active class from the currently active item
                utils.removeClass(activeItem, classNames.activeItem);

                // Applies the active class on the new item
                utils.addClass(itemToActivate, classNames.activeItem);

                // Scrolls the list to show the item
                barq.scrollListItemIntoView(itemToActivate);
            }
        };

        /**
         * @function scrollListItemIntoView
         * Calculates the position of an item and scroll the list to it. Used on keyboard navigation.
         *
         * @param {HTMLLIElement} item The item to base the scrolling on.
         */
        barq.scrollListItemIntoView = function(item) {
            // Stores the item `top` position on the list
            var itemTop = item.offsetTop;

            // Stores the active item `height`
            var itemHeight = item.offsetHeight;

            // Stores the list height
            var listHeight = barq.list.offsetHeight;

            // Stores the scroll position of the list
            var listScroll = barq.list.scrollTop;

            // Check if the item is BEFORE the list scroll area (visible elements)
            var itemIsBeforeScrollArea = itemTop <= listScroll;

            // Check if the item is AFTER the list scroll area (visible elements)
            var itemIsAfterScrollArea = itemTop >= ((listScroll + listHeight) - itemHeight);

            if (itemIsBeforeScrollArea) {
                // Scroll the list UP to show the active item on top
                barq.list.scrollTop = itemTop;
            } else if (itemIsAfterScrollArea) {
                // Scrolls the list DOWN to show the active item on bottom
                barq.list.scrollTop = (itemTop - listHeight) + itemHeight;
            }

            // ^ simply don't scroll otherwise.
        };

        /**
         * @function setupEvents
         * Just a basic events wrapper. Sets up all non-dynamic, initial events.
         */
        var setupEvents = function() {

            // TODO: Split the keyup logic into external functions
            utils.addEventListener(barq.textInput, 'keyup', function(e) {
                // Cross browser event object capturing
                e = e || win.event;

                // Cross browser key code capturing
                var keyPressed = e.keyCode || e.which;

                // Filter out navigation keys
                var isNavigationKey = false;
                for (var key in KEYCODES) {
                    if (keyPressed === KEYCODES[key]) {
                        isNavigationKey = true;
                        break;
                    }
                }

                // Any key, except navigation keys like arrows, home, end, enter, esc...
                if (!isNavigationKey) {
                    // Scrolls the list to the top, as we are filtering
                    barq.list.scrollTop = 0;

                    var matches = barq.search(this.value);

                    if (matches.length < 1) {
                        noResultsFound();
                        barq.currentItemsDOM = null;
                    }

                    barq.showList();

                    return;
                }

                // ENTER selects the active list item
                if (keyPressed === KEYCODES.ENTER) {
                    var activeItem = barq.getActiveListItem();

                    if (activeItem) {
                        barq.selectItem(activeItem);
                    }

                    return;
                }

                // ESC closes the auto complete list
                if (keyPressed === KEYCODES.ESC) {
                    barq.hideList();
                    return;
                }
            });

            utils.addEventListener(barq.textInput, 'keydown', function(e) {
                // Cross browser event object capturing
                e = e || win.event;

                // Cross browser key code capturing
                var keyPressed = e.keyCode || e.which;

                // UP or DOWN arrows navigate through the list
                if (keyPressed === KEYCODES.UP || keyPressed === KEYCODES.DOWN) {
                    // Navigate only if there are results
                    if (barq.currentItemsDOM) {
                        keyboardNavigate(keyPressed);
                    }
                }
            });

            // Focusing on the input opens up the items list
            utils.addEventListener(barq.textInput, 'focus', function() {
                var matches = barq.search(this.value);

                if (matches.length < 1) {
                    noResultsFound();
                    barq.currentItemsDOM = null;
                }

                barq.showList();
            });

            // Selects the active item in case of pressing tab or leaving the field
            utils.addEventListener(barq.textInput, 'blur', function() {
                if (!barq.preventBlurTrigger && barq.getActiveListItem()) {
                    barq.selectItem(barq.getActiveListItem());
                }
            });

            // We used mousedown instead of click to solve a race condition against blur
            // http://stackoverflow.com/questions/10652852/jquery-fire-click-before-blur-event/10653160#10653160
            utils.addEventListener(barq.list, 'mousedown', function(e) {

                // The mousedown is not enough (although required) to prevent the race
                // condition, as there is DOM manipulation involved. This nasty trick
                // takes care of it, but can definitely be improved.
                barq.preventBlurTrigger = true;

                win.setTimeout(function() {
                    barq.preventBlurTrigger = false;
                }, 1);

                // Checks if the click was performed on the highlighted part
                var item = e.target.className === classNames.match ? e.target.parentNode : e.target;

                // Prevents triggering clicks on the scrollbar & on empty results
                if (item !== barq.list && item.className !== classNames.noResults) {
                    barq.selectItem(item);
                }
            });

            // TODO: consider debounce() from lodash if we keep the resize event
            utils.addEventListener(win, 'resize', function() {
                barq.repositionList();
            });
        };
    }; // end win.Barq()

    // Allows for lazy loading of barq instances
    ;(function() {
        var lazyLoadBaseFields = doc.querySelectorAll('[data-barq]');

        // Todd Motto goes berserker against [].forEach.call() and I quite agree with his points,
        // but as a one-way loop that's used only once and needs no manipulation, this does the
        // trick quite well - http://toddmotto.com/ditch-the-array-foreach-call-nodelist-hack/
        [].forEach.call(lazyLoadBaseFields, function(baseField) {
            new win.Barq(baseField).init();
        });
    })(); // end lazy load

})(window, document);
