var kuromojin = require("kuromojin");
var tokenize = kuromojin.tokenize;
var fs = require("fs");
var path = require("path");

var content = "content/posts/blog/blog-of-policy.md";

var nodeCallbackPromise = function (target, func, args) {
  return new Promise(function(resolve, reject) {
    func.apply(target, args + [function(err, res) {
      if (err) {
        return reject(err);
      }
      return resolve(res);
    }]);
  });
}

async function recursiveDir (p, callback) {
  var stat = await nodeCallbackPromise(fs, fs.stat, [p]);

  if (stat.isDirectory()) {
    var files = await nodeCallbackPromise(fs, fs.readdir, [p]);
    return Promise.all(files.map(function(f) {
      return recursiveDir(path.join(p, f), callback);
    }));
  }

  return callback(p);
}

fs.readFile(content, "utf8", function(err, text) {
  if (err) {
    console.log(err);
    return err;
  }

  tokenize(text).then(function(path) {
    var vector = Array.prototype.reduce.call(path, function(acc, next) {
      if (next.pos != "名詞")
        return acc;

      if (!next.word_type == "KNOWN")
        return acc;

      if (next.basic_form == "*" && !next.surface_form.match(/^[\w]{6,}$/))
        return acc;

      if (acc[next.surface_form])
        acc[next.surface_form]++;
      else
        acc[next.surface_form] =  1;

      return acc;
    }, {});

    console.log(vector);
  });
});
