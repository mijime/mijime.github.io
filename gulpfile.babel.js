import path from 'path';
import gulp from 'gulp';
import textlint from 'gulp-textlint';
import htmllint from 'gulp-htmllint';
import postcss from 'gulp-postcss';
import cssmin from 'gulp-cssmin';
import stylelint from 'gulp-stylelint';
import eslint from 'gulp-eslint';
import webpack from 'webpack';

const stylelintrc = {
  'config':    {'extends': 'stylelint-config-standard'},
  'reporters': [{'formatter': 'string', 'console': true}]
};

const webpackConfig = {
  'entry': {
    'index': path.resolve(__dirname, 'source/js/browser'),
    'slide': path.resolve(__dirname, 'source/js/browser/slide'),
  },
  'output': {
    'path':          path.resolve(__dirname, 'static/js'),
    'filename':      '[name].bundle.js',
    'chunkFilename': '[id].bundle.js',
  },
  'module': {
    'rules': [{
      'test':   /\.js$/,
      'use': ['babel-loader']
    }],
  },
  'externals': {
    'mermaid':      true,
    'highlight.js': 'hljs',
  },
  'plugins': [
    new webpack.optimize.DedupePlugin(),
    new webpack.optimize.UglifyJsPlugin({
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
    .pipe(postcss())
    .pipe(cssmin())
    .pipe(gulp.dest('static'));
});

gulp.task('js', done => {
  return webpack(webpackConfig).run(done);
});

gulp.task('watch', ['default'], () => {
  gulp.watch('source/**/*.css', ['css']);
  gulp.watch('content/**/*.md', ['textlint']);
});
