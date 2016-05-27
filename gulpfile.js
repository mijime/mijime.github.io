var gulp = require('gulp');
var textlint = require('gulp-textlint');
var cssnext = require('gulp-cssnext');
var stylelint = require('gulp-stylelint');

var stylelintrc = {
  config: {extends: 'stylelint-config-standard'},
  reporters: [{formatter: 'string', console: true}]
}

gulp.task('default', ['test', 'css']);

gulp.task('test', ['textlint']);

gulp.task('textlint', function() {
  return gulp.src('content/**/*.md')
    .pipe(textlint());
});

gulp.task('css', function() {
  return gulp.src('source/**/*.css')
    .pipe(stylelint(stylelintrc))
    .pipe(cssnext())
    .pipe(gulp.dest('static'));
});
