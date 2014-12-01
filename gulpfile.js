var gulp = require('gulp');
var jshint = require('gulp-jshint');
var jscs = require('gulp-jscs');

gulp.task('jscs', function() {
    return gulp.src('barq.js')
        .pipe(jscs());
});

gulp.task('jshint', function() {
    return gulp.src('barq.js')
        .pipe(jshint())
        .pipe(jshint.reporter('default'));
});

gulp.task('validate', ['jscs', 'jshint']);

gulp.task('default', ['validate']);
