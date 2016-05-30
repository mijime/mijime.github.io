import {tokenize} from 'kuromojin';
import fs from 'fs';
import path from 'path';

class Promisify {
  constructor (context) {
    this.context = context;
  }

  node (func) {
    return (...args) => new Promise((resolve, reject) => {
      this.context[func].apply(this.context, args.concat([function(err, res) {
        if (err) {
          return reject(err);
        }

        return resolve(res);
      }]));
    });
  }
}

const fsp = new Promisify(fs);

function flatten (array) {
  return array.reduce(function (acc, next) {
    return Array.isArray(next) ? acc.concat(flatten(next)) : acc.concat(next);
  }, []);
}

async function recursiveDir (p) {
  const stat = await fsp.node('stat')(p);

  if (!stat.isDirectory()) {
    return [p];
  }

  const files = await fsp.node('readdir')(p);
  return Promise.all(files.map(async (f) => await recursiveDir(path.join(p, f))));
}

async function parseVector (p) {
  const text = await fsp.node('readFile')(p, 'utf8');
  const tokens = await tokenize(text);
  const vector = Array.prototype.reduce.call(tokens, function(acc, next) {
    if (next.pos != '名詞')
      return acc;

    if (!next.word_type == 'KNOWN')
      return acc;

    if (next.basic_form == '*' && !next.surface_form.match(/^[\w]{0,}$/))
      return acc;

    if (next.surface_form.length < 1)
      return acc;

    if (acc[next.surface_form])
      acc[next.surface_form] ++;
    else
      acc[next.surface_form] = 1;

    return acc;
  }, {});

  return vector;
}

function cosineSimilarity (curr, next) {
  const currKeys = Object.keys(curr);
  const nextKeys = Object.keys(next);
  const keys = currKeys.concat(nextKeys);

  const baseScore = keys.map(k => (curr[k] || 0) * (next[k] || 0))
    .reduce((acc, c) => (acc + c), 0);

  const currScore = keys
    .map(k => curr[k] ? Math.pow(curr[k], 2) : 0)
    .reduce((acc, c) => (acc + c), 0);

  const nextScore = keys
    .map(k => next[k] ? Math.pow(next[k], 2) : 0)
    .reduce((acc, c) => (acc + c), 0);

  const score = baseScore ? baseScore / (Math.sqrt(currScore) * Math.sqrt(nextScore)) : 0;
  return score;
}

async function main (content, contentDir) {
  const baseVector = await parseVector(content);

  const nestedFiles = await recursiveDir(contentDir);
  const files = flatten(nestedFiles);

  return Promise.all(files.map(async (file) => {
    const vector = await parseVector(file);
    const score = cosineSimilarity(baseVector, vector);
    return {file, score};
  }).map(async res => {
    const {file, score} = await res;
    console.log(score, file);
    return {file, score};
  }));
}

console.log('main start');
main(process.argv[2], process.argv[3])
  .then(res => console.log('main end'))
  .catch(err => console.log(err));
