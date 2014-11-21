/*
    Barq: client-side autocomplete
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
            removeFirstOptionFromSearch: opts.removeFirstOptionFromSearch || false,

            /**
                useFirstOptionTextAsPlaceholder
                @type bool
                If true, uses the first option as a placeholder for the autocomplete.
            */
            useFirstOptionTextAsPlaceholder: opts.useFirstOptionTextAsPlaceholder || false,

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

        barq.classNames = {
            selectedListItem: 'barq-selected',
            dropdownList: 'barq-list',
            textInput: 'barq-text-input',
            textInputWithList: 'barq-input-text-expanded',
            hidden: 'barq-hidden',
            visible: 'barq-visible',
            selectedItem: 'barq-selected-item',
            noResults: 'barq-no-results',
            match: 'barq-match'
        };

        /**
            currentPage
            @type int
            Pagination counter
        */
        barq.currentPage = 1;

        barq.el = {
            baseField: baseField
        };

        // A few tiny crossbrowser DOM utilities so we can drop jQuery
        barq.ut = {
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
                    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
                    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
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
            },

            // Adapted from lodash's baseIndexOf()
            inArray: function(array, value) {
                var index = -1, length = array.length;

                while (++index < length) {
                    if (array[index] === value) {
                        return index;
                    }
                }

                return -1;
            }
        };

        // Sets up how the autocomplete should be initialized
        barq.init = function() {
            // Hides the base field ASAP, as it's gonna be replaced by an autocomplete
            barq.ut.addClass(barq.el.baseField, barq.classNames.hidden);

            // Creates the main text input that's gonna be used as an autocomplete
            barq.el.textInput = barq.createTextInput();

            // Extracts the pre-selected option from the base field, if any
            barq.el.preSelectedOption = barq.el.baseField.querySelector('[selected]');

            // Creates an empty <ul> element to hold the list items
            barq.el.list = barq.createEmptyList();

            // Extracts the items from base field and stores them in memory
            barq.listItems = barq.extractDataFromBaseField();

            // Fills the list element with the listItems
            barq.replaceListData(barq.listItems);

            // Attaches all the event handlers
            barq.setupEvents();

            // Sets an initial selection if there's a preselected value or option
            barq.setInitialText();

            // onload user callback, setting barq as `this`
            barq.options.onload.call(barq);

            // Returns an instance of the the class itself
            return barq;
        };

        // This is the <input type="text" /> that will replace the base select element
        barq.createTextInput = function() {
            var input = doc.createElement('input');

            // Only one class ATM, no need for fancy pants .addClass()
            input.setAttribute('class', barq.classNames.textInput);

            // This is the browser autocomplete, nothing to do with the plugin
            input.setAttribute('autocomplete', 'off');

            // Checks for arbitrary text for the placeholder
            if (barq.options.arbitraryPlaceholderText) {
                input.setAttribute('placeholder', barq.options.arbitraryPlaceholderText);
            } else if (barq.options.useFirstOptionTextAsPlaceholder) {
                // If null (default), use the first <option> text from the baseField
                var firstOptionText = barq.ut.getNodeText(barq.el.baseField.options[0]);
                input.setAttribute('placeholder', firstOptionText);
            }

            // insertAdjacentHTML expects html string and not a DOM element
            barq.el.baseField.insertAdjacentHTML('afterend', input.outerHTML);

            // TODO: couldn't reference the element on creation time, check if its possible
            // TODO: this conflicts in case we have multiple instances of Barq on the same page
            return doc.querySelector('.' + barq.classNames.textInput);
        };

        // If the base element have an option with selected attribute
        barq.setInitialText = function() {
            var optionText = barq.ut.getNodeText(barq.el.preSelectedOption);
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

            return htmlString.replace(regex, li);
        };

        barq.showList = function() {
            barq.repositionList();
            barq.ut.addClass(barq.el.list, barq.classNames.visible);
            barq.ut.addClass(barq.el.textInput, barq.classNames.textInputWithList);
        };

        barq.hideList = function() {
            barq.ut.removeClass(barq.el.list, barq.classNames.visible);
            barq.ut.removeClass(barq.el.textInput, barq.classNames.textInputWithList);
        };

        barq.selectListItem = function(listItem) {
            var selectedText = barq.ut.getNodeText(listItem);

            // Focus must come before applying the text, so it doesn't select it
            barq.el.textInput.focus();
            barq.el.textInput.value = selectedText;

            // Hides the list as we don't need it anymore
            barq.hideList();

            // Set the value back on the baseField
            barq.el.baseField.value = listItem.getAttribute('data-value');

            // onchange user callback
            barq.options.onchange.call(barq);
        };

        // Creates an empty <ul> element and inserts it after the base element.
        barq.createEmptyList = function() {
            var list = doc.createElement('ul');

            list.setAttribute('class', barq.classNames.dropdownList);

            barq.el.textInput.insertAdjacentHTML('afterend', list.outerHTML);

            // TODO: couldn't reference the element on creation time, check if its possible
            return doc.querySelector('.' + barq.classNames.dropdownList);
        };

        // Abstracted into a function in case we need to do additional logic
        barq.replaceListData = function(data) {
            barq.el.list.innerHTML = data;
        };

        // Abstracted into a function in case we need to do additional logic
        barq.insertDataOnList = function(data) {
            barq.el.list.innerHTML += data;
        };

        // TODO: use a more reliable method of calculating the width
        barq.getComputedWidth = function(el) {
            var computedWidth;

            try {
                computedWidth = win.getComputedStyle(el).width;
            } catch (e) {
                computedWidth = el.currentStyle.width;
            }

            return computedWidth;
        };

        // Repositions and resizes the list when viewport size changes.
        // TODO: This implementation is pretty rough, could do with some love.
        // A good option would be tether.js but it weights ~5kb (more currently more than Barq itself).
        barq.repositionList = function() {
            // TODO: this is legacy, check if needed
            barq.currentPage = 1;

            var topPosition = Math.floor((barq.el.textInput.offsetTop + parseInt(barq.el.textInput.offsetHeight, 10)));

            var computedWidth = barq.getComputedWidth(barq.el.textInput);

            barq.el.list.style.top = topPosition + 'px';
            barq.el.list.style.left = barq.el.textInput.offsetLeft + 'px';

            // computed width already comes with 'px' suffix
            barq.el.list.style.width = computedWidth;
        };

        // Calls the regex comparison (searchListItem)and updates the list with the search results.
        barq.filterList = function(searchString) {
            var queryOffset = 0,
                queryLimit = (barq.options.resultsPerPage);

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
        // TODO: the logic for an empty string (run onFocus) is just to bring all items (spliced, if there is pagination). Can be improved.
        barq.searchListItem = function(searchString, offset, limit) {
            // initially contains all the values unless otherwise we found a match we override
            var matchedItems, matchingRegex, highlightRegex, formattedMatch;

            searchString = barq.ut.escapeString(searchString);

            if (searchString !== '') {
                matchingRegex  = new RegExp('<li[^>]*>[^<]*'+searchString+'[^<]*<\/li>', 'gi');
                highlightRegex = new RegExp('(<li[^>]*>[^<]*)('+searchString+')([^<]*<\/li>)', 'gi');

                // This could throw undefined property if match returns null
                try {
                    formattedMatch = '$1<em class="' + barq.classNames.match + '">$2</em>$3';

                    matchedItems = barq.listItems.match(matchingRegex)
                                                 .splice(offset, limit)
                                                 .join('')
                                                 .replace(highlightRegex, formattedMatch);
                }
                catch(e) {
                    return false;
                }
            } else {
                matchingRegex = new RegExp('<li[^<\/]*<\/li>', 'gi');
                matchedItems = barq.listItems.match(matchingRegex)
                                                .splice(offset, limit)
                                                .join('');
            }

            return matchedItems;
        };

        // Shown when no items were found on a search.
        barq.noResultsFound = function() {
            var item = barq.ut.stringFormat('<li class="{0}">{1}</li>',
                           barq.classNames.noResults, barq.options.noResultsMessage);

            barq.replaceListData(item);
        };

        // TODO: can probably be split within the existing logic.
        barq.updateList = function() {
            var matches = barq.filterList(barq.el.textInput.value);

            if (matches) {
                barq.showList();
            } else {
                barq.noResultsFound();
            }
        };

        // Pagination
        // TODO: looks bad, could do with some <3
        // TODO: the current way of fetching more results is based on having an item on the viewport. Sometimes
        // the user scrolls fast enough and skip the item, not triggering the pagination. Find a better alternative.
        barq.loadMoreItems = function() {
            if (!barq.options.enablePagination) return;

            // Stores the previsouly fetched elements
            var visibleListItems = barq.el.list.children;

            // Pagination is triggered when scrolling reaches the middle of the list.
            // This makes the scrolling smooth as we load the next resultset before reaching the end.
            var indexForPaginationThreshold = visibleListItems.length - (barq.options.resultsPerPage / 2);

            // Not enough elements to require pagination
            if (indexForPaginationThreshold < 0) {
                return;

            // When the scroll reaches the pagination threshold, we fetch the next resultset
            } else if (barq.ut.isElementOnViewport(visibleListItems[indexForPaginationThreshold])) {

                // Keep track of the pagination
                barq.currentPage++;

                // The result to start fetching from
                var queryOffset = barq.currentPage * barq.options.resultsPerPage;

                // The fetched results
                var nextResultPage = barq.searchListItem(barq.el.textInput.value, queryOffset, barq.options.resultsPerPage);

                // If there are results, append them to the list
                (nextResultPage != '') && barq.insertDataOnList(nextResultPage);
            }
        };

        // Initial non-dynamic event setup
        barq.setupEvents = function() {
            barq.ut.addEventListener(barq.el.textInput, 'keyup', function(e) {
                e = e || win.event;

                // Filter out navigation keys like arrow, home, end, etc
                var navigationKeys = [37, 38, 39, 40, 16, 17, 18, 20, 91, 93];
                barq.ut.inArray(navigationKeys, e.keyCode) < 0 && barq.updateList();
            });

            // Focusing on the input opens up the items list
            barq.ut.addEventListener(barq.el.textInput, 'focus', function() {
                barq.updateList();
            });

            // Needed for pagination
            barq.ut.addEventListener(barq.el.list, 'scroll', function() {
                barq.loadMoreItems();
            });

            // Item selection with clicking/tapping
            barq.ut.addEventListener(barq.el.list, 'click', function(e) {
                barq.selectListItem(e.target);
            });

            // Hides the autocomplete when clicking outside the element.
            // TODO: make sure clicking on the scrollbar doesn't trigger it
            barq.ut.addEventListener(doc.documentElement || doc.body.parentNode, 'click', function(e) {
                if (e.target == barq.el.textInput || e.target == barq.el.list) {
                    e.stopPropagation();
                } else {
                    barq.hideList();
                }
            });

            // TODO: add debounce() from lodash if we keep the resize event
            barq.ut.addEventListener(win, 'resize', function() {
                barq.repositionList();
            });
        };
    };

    return barq;
})(window, document);

// var select = document.querySelector('#barq');
// var barq = new Barq(select).init();


var select2 = document.querySelector('#barq2');
var barq2 = new Barq(select2).init();
