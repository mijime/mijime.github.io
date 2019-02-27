import {tokenize} from 'kuromojin';
import fs from 'fs';
import path from 'path';

class Promisify {
  constructor(context) {
    this.context = context;
  }

  node(func) {
    return (...args) => new Promise((resolve, reject) => {
      this.context[func].apply(this.context, args.concat([(err, res) => {
        if (err) {
          return reject(err);
        }

        return resolve(res);
      }]));
    });
  }
}

const fsp = new Promisify(fs);

function flatten(array) {
  return array.reduce((acc, next) => {
    return Array.isArray(next)
      ? acc.concat(flatten(next))
      : acc.concat(next);
  }, []);
}

function isTargetToken(token) {
  return token.pos === '名詞'
    && token.surface_form.length >= 3
    && (token.basic_form !== '*'
        || token.surface_form.match(/^[\wA-Z]+$/));
}

function removeHeader(text) {
  return text.replace(/^\+\+\+([\r\n]|.)+\n\+\+\+/, '');
}

async function recursiveDir(p) {
  const stat = await fsp.node('stat')(p);

  if (!stat.isDirectory()) {
    return [p];
  }

  const files = await fsp.node('readdir')(p);
  return Promise.all(files.map(async f => await recursiveDir(path.join(p, f))));
}

async function parseVector(text) {
  const tokens = await tokenize(text);
  return tokens.reduce((acc, next) => {
    if (!isTargetToken(next)) {
      return acc;
    }

    if (acc[next.surface_form]) {
      acc[next.surface_form]++;
    } else {
      acc[next.surface_form] = 1;
    }

    return acc;
  }, {});
}

function cosineSimilarity(curr, next) {
  const currKeys = Object.keys(curr);
  const nextKeys = Object.keys(next);
  const keys = currKeys.concat(nextKeys)
    .filter((v, i, self) => self.indexOf(v) === i);

  const baseScore = keys
    .map(k => (curr[k] || 0) * (next[k] || 0))
    .reduce((acc, c) => acc + c, 0);

  const currScore = keys
    .map(k => curr[k] ? Math.pow(curr[k], 2) : 0)
    .reduce((acc, c) => acc + c, 0);

  const nextScore = keys
    .map(k => next[k] ? Math.pow(next[k], 2) : 0)
    .reduce((acc, c) => acc + c, 0);

  const score = baseScore
    ? baseScore / (Math.sqrt(currScore) * Math.sqrt(nextScore))
    : 0;
  const words = keys.filter(k => curr[k] && next[k]);
  return {score, words};
}

async function main(content, contentDirs) {
  const text = await fsp.node('readFile')(content, 'utf8');
  const baseVector = await parseVector(removeHeader(text));

  const nestedFiles = await Promise.all(
    contentDirs.map(dir => recursiveDir(dir)));
  const files = flatten(nestedFiles);

  return Promise.all(files.map(async file => {
    const text = await fsp.node('readFile')(file, 'utf8');
    return {file, text};
  }).map(async res => {
    const {file, text} = await res;
    const vector = await parseVector(removeHeader(text));
    const {score, words} = cosineSimilarity(baseVector, vector);
    return {file, score, words};
  }).map(async res => {
    const {file, score, words} = await res;
    process.stdout.write([
      `${Math.floor(score * 10000) / 100}%`,
      file,
      words.slice(0, 5).join(', '),
      '\n'].join('\t'));
    return {file, score};
  }));
}

process.argv.shift();
process.argv.shift();
const content = process.argv.shift();

main(content, process.argv)
  .catch(err => process.stderr.write(err));
