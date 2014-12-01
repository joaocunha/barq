var gulp = require('gulp');
var jshint = require('gulp-jshint');
var jscs = require('gulp-jscs');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var notify = require('gulp-notify');

var path = 'barq.js';

gulp.task('lint', function() {
    return gulp.src(path)
        .pipe(jscs())
        .pipe(jshint())
        .pipe(notify({
            title: 'JSHint',
            message: 'JSHint Passed. Let it fly!',
        }))
        .pipe(jshint.reporter('default'));
});

gulp.task('compress', function() {
    return gulp.src(path)
        .pipe(uglify({
            preserveComments: 'some'
        }))
        .pipe(rename({
            suffix: '.min'
        }))
        .pipe(gulp.dest(''));
});

gulp.task('build', ['lint', 'compress']);
