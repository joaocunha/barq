/**
 * @license MIT
 *
 * Barq: client-side autocomplete
 * https://github.com/joaocunha/barq/
 *
 * @author João Cunha - joao@joaocunha.net - twitter.com/@joaocunha
 *
 * Thanks to all contributors, specially @Ahmad-Dukhan, @Ghostavio, @kumailht and @gxx
 */

;(function(win, doc, undefined) {
    'use strict';

    // We declare the plugin as a globally accessible variable, so we
    // can instantiate outside the anonymous self-invoking function
    win.Barq = function(baseField, opts) {
        var barq = this, opts = opts || {};

        barq.options = {
            /**
                enablePagination
                @type bool
                Fetches the matches with a limit. Specially useful for large resultsets.
            */
            enablePagination: opts.enablePagination || true,

            /**
                resultsPerPage
                @type int
                Number of list items to fetch per page.
            */
            resultsPerPage: opts.resultsPerPage || 50,

            /**
                removeFirstOptionFromSearch
                @type bool
                If true, removes the first option element from the search. Useful when
                it's something like "<option>Select a value</option>"
            */
            removeFirstOptionFromSearch: opts.removeFirstOptionFromSearch || true,

            /**
                useFirstOptionTextAsPlaceholder
                @type bool
                If true, uses the first option as a placeholder for the autocomplete.
            */
            useFirstOptionTextAsPlaceholder: opts.useFirstOptionTextAsPlaceholder || true,

            /**
                arbitraryPlaceholderText
                @type null|string
                Allows to set an arbitrary placeholder value, overriding first
                option's text which is the default.
            */
            arbitraryPlaceholderText: opts.arbitraryPlaceholderText || null,

            /**
                noResultsMessage
                @type string
                Message to show when no matches are found on the search.
            */
            noResultsMessage: opts.noResultsMessage || 'No results found.',

            /**
                onload
                @type function
                Called after instantiation, once.
            */
            onload: opts.onload || function(){},

            /**
                onchange
                @type function
                Called everytime an item is selected from the list.
            */
            onchange: opts.onchange || function(){}
        };

        /**
            classNames
            @type object
            Holds all the classes to avoid code repetition
        */
        var classNames = {
            dropdownList: 'barq-list',
            textInput: 'barq-text-input',
            textInputWithList: 'barq-input-text-expanded',
            hidden: 'barq-hidden',
            visible: 'barq-visible',
            activeItem: 'barq-active-item',
            noResults: 'barq-no-results',
            match: 'barq-match'
        };

        /**
            KEYCODES
            @type object
            List of the navigation key codes we're interested at, in a constant format
        */
        var KEYCODES = {
            TAB: 9,
            ENTER: 13,
            ESC: 27,
            END: 35,
            HOME: 36,
            LEFT: 37,
            UP: 38,
            RIGHT: 39,
            DOWN: 40
        };

        /**
            currentPage
            @type int
            Pagination counter
        */
        var currentPage = 1;

        barq.el = {
            baseField: baseField
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
                el.classList ? el.classList.add(className) : el.className += ' ' + className;
            },

            removeClass: function(el, className) {
                if (el.classList) {
                    el.classList.remove(className);
                } else {
                    var regex = new RegExp('(^|\\b)' + className.split(' ').join('|') + '(\\b|$)', 'gi');
                    el.className = el.className.replace(regex, ' ');
                }
            },

            // Crossbrowser way to return the text of a dom node
            getNodeText: function(node) {
                return (node && (node.innerText || node.textContent || node.innerHTML));
            },

            // Detects if an element is visible on the viewport
            isElementOnViewport: function(el) {
                var rect = el.getBoundingClientRect();

                return (
                    rect.top >= 0 &&
                    rect.left >= 0 &&
                    rect.bottom <= (win.innerHeight || doc.documentElement.clientHeight) &&
                    rect.right <= (win.innerWidth || doc.documentElement.clientWidth)
                );
            },

            // Escapes the regex operators from the search string
            // TODO: make it customizable on options
            escapeString: function(text) {
                return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
            },

            // Allows micro-templating like stringFormat('<span class="{0}">{1}</span>', 'greeting', 'Hello World');
            // TODO: worth having?
            stringFormat: function() {
                var s = arguments[0];

                for (var i = 0; i < arguments.length - 1; i++) {
                    var reg = new RegExp("\\{" + i + "\\}", "gm");
                    s = s.replace(reg, arguments[i + 1]);
                }

                return s;
            }
        };

        // Sets up how the autocomplete should be initialized
        barq.init = function() {
            // Hides the base field ASAP, as it's gonna be replaced by the autocomplete text input.
            // We don't remove the base element as it holds the `name` attribute and values,
            // so it's useful in case of form submission.
            utils.addClass(barq.el.baseField, classNames.hidden);

            // Creates the main text input that's gonna be used as an autocomplete
            barq.el.textInput = barq.createTextInput();

            // Extracts the pre-selected option from the base field, if any
            barq.el.preSelectedOption = barq.el.baseField.querySelector('[selected]');

            // Creates the empty <ul> element to hold the list items
            barq.el.list = barq.createEmptyList();

            // Extracts the items from the base field and stores them in memory as a string representation
            barq.listItems = barq.extractDataFromBaseField();

            // Fills the list element with the listItems
            barq.replaceListData(barq.listItems);

            // Attaches all the event handlers
            barq.setupEvents();

            // Sets an initial selection if there's a preselected value or option
            barq.setInitialText();

            // onload user callback, passing barq as `this`
            barq.options.onload.call(barq);

            // Returns an instance of itself, so we can access from outside
            return barq;
        };

        // This is the <input type="text" /> that will replace the base select element
        barq.createTextInput = function() {
            var input = doc.createElement('input');

            // Only one class ATM, no need for fancy pants .addClass()
            input.setAttribute('class', classNames.textInput);

            // Prevents some HTML5 trickery to mess with our stuff
            input.setAttribute('autocapitalize', 'off');
            input.setAttribute('autocomplete', 'off');
            input.setAttribute('autocorrect', 'off');
            input.setAttribute('spellcheck', 'false');

            // Replicates the tabindex from the basefield...
            input.setAttribute('tabindex', barq.el.baseField.tabIndex);

            // ...and removes it from the basefield
            // http://stackoverflow.com/a/5192919/1411163
            barq.el.baseField.setAttribute('tabindex', '-1');

            // Checks for arbitrary text for the placeholder
            if (barq.options.arbitraryPlaceholderText) {
                input.setAttribute('placeholder', barq.options.arbitraryPlaceholderText);
            } else if (barq.options.useFirstOptionTextAsPlaceholder) {
                // If null (default), use the first <option> text from the baseField
                var firstOptionText = utils.getNodeText(barq.el.baseField.options[0]);
                input.setAttribute('placeholder', firstOptionText);
            }

            // Insert the input field right after the base select element
            barq.el.baseField.insertAdjacentHTML('afterend', input.outerHTML);

            // We grab it back from the DOM, as insertAdjecentHTML doesn't return the inserted element
            return barq.el.baseField.nextElementSibling;
        };

        // If the base element have an option with selected attribute
        barq.setInitialText = function() {
            var optionText = utils.getNodeText(barq.el.preSelectedOption);
            barq.el.textInput.value = optionText;
        };

        // Grabs all the OPTION elements and replaces them by LI's, building a string containing all of them
        barq.extractDataFromBaseField = function() {
            // Removes the first option if required (DOM is faster than regex in this case)
            if (barq.options.removeFirstOptionFromSearch) {
                barq.el.baseField.removeChild(barq.el.baseField.options[0]);
            }

            // Transforms all the <option> elements in <li> elements.
            // The data-value attribute carries the original <option> value.
            var htmlString = barq.el.baseField.innerHTML;
            var regex = /<option(?:[^>]*?value="([^"]*?)"|)[^>]*?>(.*?)<\/option>\n?/gi;
            var li = '<li data-value="$1">$2</li>';

            htmlString = htmlString.replace(regex, li);

            // Clean up comments and whitespace
            htmlString = htmlString.replace(/<!--([^\[|(<!)].*)/g, '')
                                   .replace(/\s{2,}/g, '')
                                   .replace(/(\r?\n)/g, '');

            return htmlString;
        };

        barq.showList = function() {
            barq.repositionList();
            utils.addClass(barq.el.list, classNames.visible);
            utils.addClass(barq.el.textInput, classNames.textInputWithList);

            // Sets the first item as active, so we can start our navigation from there
            utils.addClass(barq.el.list.firstChild, classNames.activeItem);
            barq.el.activeItem = barq.el.list.firstChild;
        };

        barq.hideList = function() {
            utils.removeClass(barq.el.list, classNames.visible);
            utils.removeClass(barq.el.textInput, classNames.textInputWithList);
        };

        barq.selectListItem = function(listItem) {
            var selectedText = utils.getNodeText(listItem);

            // Sets the selected item's text on the input
            barq.el.textInput.value = selectedText;

            // Stores the text on barq itself
            barq.text = selectedText;

            // Hides the list as we don't need it anymore
            barq.hideList();

            var val = listItem.getAttribute('data-value');

            // Set the value back on the baseField
            barq.el.baseField.value = val;

            // Store the value on Barq itself
            barq.value = val;

            // Updates the reference to the activeElement
            barq.el.activeElement = listItem;

            // onchange user callback
            barq.options.onchange.call(barq);
        };

        // Creates an empty <ul> element and inserts it after the autocomplete input.
        barq.createEmptyList = function() {
            var list = doc.createElement('ul');

            list.setAttribute('class', classNames.dropdownList);

            // Insert the list right after the autocomplete input
            barq.el.textInput.insertAdjacentHTML('afterend', list.outerHTML);

            // We grab it back from the DOM, as insertAdjecentHTML doesn't return the inserted element
            return barq.el.textInput.nextElementSibling;
        };

        // Abstracted into a function in case we need to do additional logic
        barq.replaceListData = function(data) {
            barq.el.list.innerHTML = data;
        };

        // Abstracted into a function in case we need to do additional logic
        barq.insertDataOnList = function(data) {
            barq.el.list.innerHTML += data;
        };

        // Repositions and resizes the list when viewport size changes.
        // A good option would be tether.js but it weights ~5kb (more than Barq itself) :(
        barq.repositionList = function() {
            var topPosition = Math.floor((barq.el.textInput.offsetTop + parseInt(barq.el.textInput.offsetHeight, 10)));

            barq.el.list.style.top = topPosition + 'px';
            barq.el.list.style.left = barq.el.textInput.offsetLeft + 'px';
            barq.el.list.style.width = barq.el.textInput.offsetWidth + 'px';
        };

        // Calls the regex comparison (searchListItem) and updates the list with the search results.
        barq.filterList = function(searchString) {
            // Where the cursor starts
            // TODO: needed? Why always 0?
            var queryOffset = 0;

            // Number of results we'll fetch per page
            var queryLimit = (barq.options.resultsPerPage);

            // Filtering results
            var matchedElements = barq.searchListItem(searchString, queryOffset, queryLimit);

            if (matchedElements) {
                barq.replaceListData(matchedElements);
                return true;
            } else {
                return false;
            }
        };

        // Uses regex to search through the list items. Accepts offset and limit for pagination. This is where most of the magic happens.
        // We search on the items list (string) with `match`, which returns an array of matches.
        // We `splice` this array to return only a chunk of results, based
        // on the pagination. We then `join` that chunk, converting it back to a string,
        // and perform a `replace` to add highlighting.

        // TODO: looks uber ugly, can definitely be improved.
        // TODO: maybe the splice can also be done with regex.
        barq.searchListItem = function(searchString, offset, limit) {
            // initially contains all the values unless otherwise we found a match we override
            var matchedItems, highlightRegex, formattedMatch;

            // Escape some special characters to prevent breaking dynamic the regex
            searchString = utils.escapeString(searchString);

            var matchingRegex;
            if (searchString !== '') {
                // We create a dynamic regex based on the search query
                matchingRegex  = new RegExp('<li[^>]*>[^<]*'+searchString+'[^<]*<\/li>', 'gi');
            } else {
                // Matches all list elements, as there is no search query
                matchingRegex = /<li[^<]*<\/li>/gi;
            }

            matchedItems = barq.listItems.match(matchingRegex);

            if (matchedItems) {
                matchedItems = matchedItems.splice(offset, limit).join('');
            } else {
                return false;
            }

            if (searchString !== '') {
                highlightRegex = new RegExp('(<li[^>]*>[^<]*)('+searchString+')([^<]*<\/li>)', 'gi');
                formattedMatch = '$1<em class="' + classNames.match + '">$2</em>$3';
                matchedItems = matchedItems.replace(highlightRegex, formattedMatch);
            }

            return matchedItems;
        };

        // Shown when no items were found on a search.
        barq.noResultsFound = function() {
            var item = utils.stringFormat('<li class="{0}">{1}</li>',
                           classNames.noResults, barq.options.noResultsMessage);

            barq.replaceListData(item);
        };

        // TODO: can probably be split within the existing logic.
        barq.updateList = function() {
            var matches = barq.filterList(barq.el.textInput.value);

            if (matches) {
                barq.showList();

                // Stores a DOM representation of the items every time a search is performed
                barq.el.currentListItemsDOM = barq.el.list.childNodes;
            } else {
                barq.noResultsFound();
                barq.el.currentListItemsDOM = null;
            }
        };

        // Pagination
        // TODO: the current way of fetching more results is based on having an item on the viewport.
        // Maybe there is a better alternative.
        barq.loadMoreItems = function() {
            if (!barq.options.enablePagination) return;

            // Stores the previsouly fetched elements
            var visibleListItems = barq.el.list.children;

            // Pagination is triggered when scrolling reaches the second last item.
            var indexForPaginationThreshold = visibleListItems.length - 2;

            // Not enough elements to require pagination
            if (indexForPaginationThreshold < 0) {
                return;

            // When the scroll reaches the pagination threshold, we fetch the next resultset
            } else if (utils.isElementOnViewport(visibleListItems[indexForPaginationThreshold])) {

                // Keep track of the pagination
                currentPage++;

                // The result to start fetching from
                var queryOffset = currentPage * barq.options.resultsPerPage;

                // The fetched results
                var nextResultPage = barq.searchListItem(barq.el.textInput.value, queryOffset, barq.options.resultsPerPage);

                // If there are results, append them to the list
                (nextResultPage !== '') && barq.insertDataOnList(nextResultPage);
            }
        };

        barq.keyboardNavigate = function(keyPressed) {
            // No results, prevent navigation
            if (!barq.el.currentListItemsDOM) { return; }

            // The stored search results
            var items = barq.el.currentListItemsDOM;

            // Stores the currently active item
            var activeItem = barq.el.activeItem;

            // The index of the active element will be the start of the navigation
            var activeItemIndex = Array.prototype.indexOf.call(items, activeItem);

            // The now active item (safe initial value)
            var itemIndexToActivate = activeItemIndex;

            // Prevent looping from first to last / last to first
            if (keyPressed === KEYCODES.UP) {
                // Actives the previous item only if it's not the first item of the list
                (itemIndexToActivate > 0) && itemIndexToActivate--;
            } else {
                // Don't activate the next item if it's the last one
                (itemIndexToActivate < items.length - 1) && itemIndexToActivate++;
            }

            // Removes the active class from the currently active item
            utils.removeClass(activeItem, classNames.activeItem);

            // Applies the active class on the new item
            utils.addClass(items[itemIndexToActivate], classNames.activeItem);

            // Stores the new active item globally
            barq.el.activeItem = items[itemIndexToActivate];

            // Scrolls the list to show the item
            barq.scrollListItemIntoView(barq.el.activeItem);
        };

        barq.scrollListItemIntoView = function(item) {
            // Stores the item `top` position on the list
            var itemTop = item.offsetTop;

            // Stores the active item `height`
            var itemHeight = item.offsetHeight;

            // Stores the list height
            var listHeight = barq.el.list.offsetHeight;

            // Stores the scroll position of the list
            var listScroll = barq.el.list.scrollTop;

            // Check if the item is BEFORE the list scroll area (visible elements)
            var itemIsBeforeScrollArea = itemTop <= listScroll;

            // Check if the item is AFTER the list scroll area (visible elements)
            var itemIsAfterScrollArea = itemTop >= ((listScroll + listHeight ) - itemHeight);

            // TODO: its scrolling to the top

            if (itemIsBeforeScrollArea) {
                // Scroll the list UP to show the active item on top
                barq.el.list.scrollTop = itemTop;
            } else if (itemIsAfterScrollArea) {
                // Scrolls the list DOWN to show the active item on bottom
                barq.el.list.scrollTop = (itemTop - listHeight) + itemHeight;
            }
        };

        // Initial non-dynamic event setup
        barq.setupEvents = function() {
            utils.addEventListener(barq.el.textInput, 'keyup', function(e) {
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
                    barq.updateList();
                    return;
                }

                // ENTER selects the list item
                if (keyPressed === KEYCODES.ENTER) {
                    barq.selectListItem(barq.el.activeItem);
                    return;
                }

                // ESC closes the auto complete list
                if (keyPressed === KEYCODES.ESC) {
                    barq.hideList();
                    return;
                }
            });

            utils.addEventListener(barq.el.textInput, 'keydown', function(e) {
                // Cross browser event object capturing
                e = e || win.event;

                // Cross browser key code capturing
                var keyPressed = e.keyCode || e.which;

                // UP or DOWN arrows navigate through the list
                if (keyPressed === KEYCODES.UP || keyPressed === KEYCODES.DOWN) {
                    barq.keyboardNavigate(keyPressed);
                }
            });

            // Focusing on the input opens up the items list
            utils.addEventListener(barq.el.textInput, 'focus', function() {
                barq.updateList();
            });

            // Selects the active item in case of pressing tab or leaving the field
            utils.addEventListener(barq.el.textInput, 'blur', function() {
                barq.selectListItem(barq.el.activeItem);
            });

            // Needed for pagination
            utils.addEventListener(barq.el.list, 'scroll', function() {
                barq.loadMoreItems();
            });

            // We used mousedown instead of click to solve a race condition against blur
            // http://stackoverflow.com/questions/10652852/jquery-fire-click-before-blur-event/10653160#10653160
            utils.addEventListener(barq.el.list, 'mousedown', function(e) {
                // Checks if the click was performed on the highlighted part
                var item = e.target.className === classNames.match ? e.target.parentNode : e.target;

                // Prevents triggering clicks on the scrollbar
                if (item !== barq.el.list) {

                    // Updates the activeItem
                    barq.el.activeItem = item;

                    // Selects it
                    barq.selectListItem(item);
                }
            });

            // TODO: add debounce() from lodash if we keep the resize event
            utils.addEventListener(win, 'resize', function() {
                barq.repositionList();
            });
        };
    }; // end win.Barq()

})(window, document);
