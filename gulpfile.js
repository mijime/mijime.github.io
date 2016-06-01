var gulp = require('gulp');
var textlint = require('gulp-textlint');
var cssnext = require('gulp-cssnext');
var stylelint = require('gulp-stylelint');
var eslint = require('gulp-eslint');
var webpack = require('gulp-webpack');

var stylelintrc = {
  'config':    {'extends': 'stylelint-config-standard'},
  'reporters': [{'formatter': 'string', 'console': true}]
};

var webpackConfig = {
  'entry': {
    'index': './source/js/browser',
  },
  'output': {
    'filename':      '[name].bundle.js',
    'chunkFilename': '[id].bundle.js',
  },
  'module': {
    'loaders': [{
      'test':   /\.js$/,
      'loader': 'babel'
    }],
  },
  'externals': {
    'mermaid':      true,
    'highlight.js': 'hljs',
  },
};

gulp.task('default', ['test', 'css', 'js']);

gulp.task('test', ['textlint', 'eslint']);

gulp.task('textlint', function() {
  return gulp.src('content/**/*.md')
    .pipe(textlint());
});

gulp.task('eslint', function() {
  return gulp.src('source/js/**/*.js')
    .pipe(eslint({'useEslintrc': true}))
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
});

gulp.task('css', function() {
  return gulp.src('source/**/*.css')
    .pipe(stylelint(stylelintrc))
    .pipe(cssnext())
    .pipe(gulp.dest('static'));
});

gulp.task('js', function() {
  return gulp.src('source/js/browser/*.js')
    .pipe(eslint({'useEslintrc': true}))
    .pipe(eslint.format())
    .pipe(eslint.failAfterError())
    .pipe(webpack(webpackConfig))
    .pipe(gulp.dest('static/js'));
});

gulp.task('watch', ['default'], function() {
  gulp.watch('source/**/*.css', ['css']);
  gulp.watch('content/**/*.md', ['textlint']);
});
