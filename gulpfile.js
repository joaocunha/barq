var gulp = require('gulp');
var jshint = require('gulp-jshint');
var jscs = require('gulp-jscs');

gulp.task('lint', function() {
    return gulp.src('barq.js')
        .pipe(jscs())
        .pipe(jshint())
        .pipe(jshint.reporter('default'));
});

gulp.task('validate', ['lint']);
