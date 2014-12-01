barq
====

barq is a client-side auto-complete for large datasets.

Ideally, the number of options in a drop-down list [shouldn't exceed ~15](http://baymard.com/blog/drop-down-usability) - if that's the case, it's good to use an auto-complete to improve the user experience.

For fields like a country-selector (around 200 elements), there are plenty of client-side libs that do the job quite well. But when it comes to large datasets like in flights and hotels price comparison websites, the only solution so far was to use an auto-complete that fetches data from the server everytime you press a key.

Albeit being light enough to enhance any `<select>` element, that's when barq really excels. By following the old adage "keep DOM manipulation to a minimum", barq's regex powered core is able to filter through thousands of elements at lightning-fast speed.

barq can enhance the user experience and save you dozens of HTTP requests while doing it.

## Main features:

 - **Fast:** it filters through a couple thousand elements in _less than 1ms_.
 - **Lightweight:** ~2kb after GZIP.
 - **Accessible:** it progressively enhances a standard `<select>` element.
 - **Library agnostic:** it is written in pure VanillaJS™.
 - **Well supported:** works in IE9+ and all modern browsers, including mobile.

## Contributing

The [issue tracker](https://github.com/joaocunha/barq/issues) is your starting point.

Make sure to read our [contribution guidelines](https://github.com/joaocunha/barq/blob/master/CONTRIBUTING.MD), too.
