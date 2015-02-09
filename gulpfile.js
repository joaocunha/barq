var gulp = require('gulp');
var jshint = require('gulp-jshint');
var jscs = require('gulp-jscs');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var notify = require('gulp-notify');
var browserSync = require('browser-sync');

var paths = {
    src: 'src',
    dist: 'dist'
};

gulp.task('lint', function() {
    return gulp.src(paths.src + '/**/*.js')
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

gulp.task('compress:js', function() {
    return gulp.src(paths.src + '/**/*.js')
        // Add a non-minified copy to the dist folder before compression
        .pipe(gulp.dest(paths.dist))
        .pipe(uglify({
            preserveComments: 'some'
        }))
        .pipe(rename({
            suffix: '.min'
        }))
        .pipe(gulp.dest(paths.dist))
        .pipe(browserSync.reload({
            stream: true
        }));
});

gulp.task('browser-sync', function() {
    return browserSync({
        server: {
          baseDir: "./"
        }
    });
});

gulp.task('watch', function() {
    gulp.watch(paths.src + '/**/*.js', ['lint', 'compress:js']);
});

gulp.task('build', ['lint', 'compress:js']);

gulp.task('default', ['lint', 'compress:js', 'watch']);
