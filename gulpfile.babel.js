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
      'test': /\.js$/,
      'use':  ['babel-loader']
    }],
  },
  'externals': {
    'mermaid':      true,
    'highlight.js': 'hljs',
  },
  'devtool': 'source-map',
};


function textlintTask() {
  return gulp.src('content/**/*.md')
    .pipe(textlint());
}

function htmllintTask() {
  return gulp.src('layout/**/*.html')
    .pipe(htmllint());
}

function eslintTask() {
  return gulp.src('source/js/**/*.js')
    .pipe(eslint({'useEslintrc': true}))
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
}

function cssTask() {
  return gulp.src('source/**/*.css')
    .pipe(stylelint(stylelintrc))
    .pipe(postcss())
    .pipe(cssmin())
    .pipe(gulp.dest('static'));
}

function jsTask(done) {
  return webpack(webpackConfig).run(done);
}

const testTask = gulp.parallel(textlintTask, eslintTask, htmllintTask);
const buildTask = gulp.parallel(testTask, cssTask, jsTask);

export default buildTask;
