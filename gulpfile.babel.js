import gulp from 'gulp';
import textlint from 'gulp-textlint';
import htmllint from 'gulp-htmllint';
import cssnext from 'gulp-cssnext';
import cssmin from 'gulp-cssmin';
import stylelint from 'gulp-stylelint';
import eslint from 'gulp-eslint';
import webpack from 'webpack-stream';

const stylelintrc = {
  'config':    {'extends': 'stylelint-config-standard'},
  'reporters': [{'formatter': 'string', 'console': true}]
};

const webpackConfig = {
  'entry': {
    'index': './source/js/browser',
    'slide': './source/js/browser/slide',
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
  'plugins': [
    new webpack.webpack.optimize.UglifyJsPlugin({
      'minimize':  true,
      'sourceMap': true,
    }),
  ],
  'devtool': 'source-map',
};

gulp.task('default', ['test', 'css', 'js']);

gulp.task('test', ['textlint', 'eslint', 'htmllint']);

gulp.task('textlint', () => {
  return gulp.src('content/**/*.md')
    .pipe(textlint());
});

gulp.task('htmllint', () => {
  return gulp.src('layout/**/*.html')
    .pipe(htmllint());
});

gulp.task('eslint', () => {
  return gulp.src('source/js/**/*.js')
    .pipe(eslint({'useEslintrc': true}))
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
});

gulp.task('css', () => {
  return gulp.src('source/**/*.css')
    .pipe(stylelint(stylelintrc))
    .pipe(cssnext())
    .pipe(cssmin())
    .pipe(gulp.dest('static'));
});

gulp.task('js', () => {
  return gulp.src('source/js/browser/*.js')
    .pipe(eslint({'useEslintrc': true}))
    .pipe(eslint.format())
    .pipe(eslint.failAfterError())
    .pipe(webpack(webpackConfig))
    .pipe(gulp.dest('static/js'));
});

gulp.task('watch', ['default'], () => {
  gulp.watch('source/**/*.css', ['css']);
  gulp.watch('content/**/*.md', ['textlint']);
});
