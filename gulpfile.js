var gulp = require('gulp');
var jshint = require('gulp-jshint');
var jscs = require('gulp-jscs');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var notify = require('gulp-notify');
var browserSync = require('browser-sync');
var reload = browserSync.reload;

var path = 'barq.js';

gulp.task('lint', function() {
    return gulp.src(path)
        .pipe(jscs())
        .pipe(notify({
            title: '✔ jscs passed',
            message: 'Cheers for sticking to the coding guidelines.',
        }))
        .pipe(jshint())
        .pipe(jshint.reporter('jshint-stylish'))
        .pipe(notify({
            title: '✔ JSHint passed',
            message: 'Crockford would be proud. Oh, wait.',
        }))
        .pipe(browserSync.reload({
            stream: true
        }));
});

gulp.task('compress', function() {
    return gulp.src(path)
        .pipe(uglify({
            preserveComments: 'some'
        }))
        .pipe(rename({
            suffix: '.min'
        }))
        .pipe(gulp.dest(''))
        .pipe(browserSync.reload({
            stream: true
        }));
});

gulp.task('browser-sync', function() {
    var files = [
        './index.html',
        './barq.css',
        './barq.js'
    ];
    browserSync.init(files, {
        server: {
          baseDir: "./"
        }
    });
});

gulp.task('watch', ['lint', 'compress', 'browser-sync'], function() {
    gulp.watch('./barq.js', ['lint', 'compress']);
});

gulp.task('build', ['lint', 'compress']);

gulp.task('default', ['lint', 'compress', 'watch']);
