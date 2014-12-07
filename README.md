barq
====

barq is a client-side autocomplete for large datasets.

## Details

Ideally, the number of options in a drop-down list [shouldn't exceed ~15](http://baymard.com/blog/drop-down-usability) - if that's the case, it's good to use an autocomplete to improve the user experience.

For fields like a country-selector (around 200 elements), there are plenty of client-side libs that do the job quite well. But when it comes to large datasets like in flights and hotels price comparison websites, the only solution so far was to use an autocomplete that fetches data from the server everytime you press a key.

Albeit being light enough to enhance any `<select>` element, that's when barq really excels. By following the old adage "keep DOM manipulation to a minimum", barq's regex powered core is able to filter through thousands of elements at lightning-fast speed.

The ideal use scenario is when the data can be cached by the server, so it serves it faster and with no queries to the database. But you need to find the right balance - you don't want to load humongous chunks of HTML.

If used properly, barq can enhance the user experience and save you dozens of HTTP requests while doing it.

## Main features

 - **Fast:** it filters through a couple thousand elements in _less than 1ms_.
 - **Lightweight:** ~2kb after GZIP.
 - **Accessible:** it progressively enhances a standard `<select>` element.
 - **Library agnostic:** it is written in pure VanillaJS™.
 - **Well supported:** works in IE9+ and all modern browsers, including mobile.

## Lazy instance
```html
<!-- The data-barq attribute does the trick -->
<select data-barq>
    <option>Select a guitar model</option>
    <option value="1">Grigson Les Pool</option>
    <option value="2">Fonder Star O'Caster</option>
    <option value="3">Wash and Burn N3</option>
</select>

<script src="barq.min.js"></script>
```

## Manual instance + parameters
```html
<select id="guitars">
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
        noResultsMessage: 'No guitars for you, bro :(',
        onchange: function() {
            alert('You selected ' + this.text);
        }
    }).init();
</script>

```

## Load data from JSON
```html
<!-- Skeleton -->
<select id="guitars">
    <option>Select a guitar model</option>
</select>

<script src="barq.min.js"></script>

<script>
    var select = document.querySelector('#guitars');

    var data = {
        "guitars": [{
            "text": "Grigson Les Pool",
            "value": 1
        }, {
            "text": "Fonder Star O'Caster",
            "value": 2
        }, {
            "text": "Wash and Burn N3",
            "value": 3
        }
    ]};

    var barq = new Barq(select, {
        dataSource: data.guitars
    }).init();
</script>

```


## Contributing

The [issue tracker](https://github.com/joaocunha/barq/issues) is your starting point.

Make sure to read our [contribution guidelines](https://github.com/joaocunha/barq/blob/master/CONTRIBUTING.MD), too.
