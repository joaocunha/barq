barq [DEPRECATED - [why?](http://stackoverflow.com/a/1732454/1411163)]
====

**barq** is a regex powered, bare bones autocomplete that does one job very well. If you need fancy features, I recommend Brian Reavis' [selectize.js](https://github.com/brianreavis/selectize.js/).

## Main features

 - **Fast:** mostly single-digit miliseconds operations.
 - **Light:** ~2kb after gzip.
 - **Agnostic:** written in pure VanillaJS™.
 - **Accessible:** progressively enhances a standard `<select>` element.
 - **Supportive:** IE9+ and modern browsers, including mobile.

## Usage

### Lazy instance with default options
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

### Manual instance + custom options
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
