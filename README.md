barq [beta]
====

barq is a client-side autocomplete for large datasets.

## Details

Ideally, the number of options in a drop-down list [shouldn't exceed ~15](http://baymard.com/blog/drop-down-usability) - if that's the case, it's good to use an autocomplete to improve the user experience.

For fields like a country-selector (around 200 elements), there are plenty of client-side libs that do the job quite well. But when it comes to large datasets like in flights and hotels price comparison websites, the only solution so far was to use an autocomplete that fetches data from the server everytime you press a key.

Albeit being light enough to enhance any `<select>` element, that's when barq really excels. By following the old adage "keep DOM manipulation to a minimum", barq's regex powered core is able to filter through elements at lightning-fast speed.

## Main features

 - **Fast:** mostly single-digit ms operations.
 - **Lightweight:** ~2kb after GZIP.
 - **Accessible:** it progressively enhances a standard `<select>` element.
 - **Library agnostic:** it is written in pure VanillaJS™.
 - **Well supported:** works in IE9+ and all modern browsers, including mobile.

## Usage

### Lazy instance
```html
<!-- The data-barq attribute triggers the instantiation -->
<select data-barq>
    <option>Select a guitar model</option>
    <option value="1">Grigson Les Pool</option>
    <option value="2">Fonder Star O'Caster</option>
    <option value="3">Wash and Burn N3</option>
</select>

<!-- No additional JS needed - just load the lib and you're set -->
<script src="barq.min.js"></script>
```

### Manual instance + parameters
```html
<!-- No need for data-barq -->
<select id="guitars">
    <!-- We are gonna provide a placeholder with the options -->
    <option value="1">Grigson Les Pool</option>
    <option value="2">Fonder Star O'Caster</option>
    <option value="3">Wash and Burn N3</option>
</select>

<script src="barq.min.js"></script>

<script>
    var select = document.querySelector('#guitars');

    var barq = new Barq(select, {
        enablePagination: false,
        removeFirstOptionFromSearch: false,
        useFirstOptionTextAsPlaceholder: false,
        placeholderText: 'Select teh guitar',
        noResultsMessage: 'No guitars for you, pal :(',
        onchange: function() {
            alert('You selected the ' + this.text + ' model.');
        }
    }).init();
</script>

```

## Contributing

The [issue tracker](https://github.com/joaocunha/barq/issues) is your starting point.

Make sure to read our [contribution guidelines](https://github.com/joaocunha/barq/blob/master/CONTRIBUTING.md), too.
