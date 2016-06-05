const printLink = document.createElement('link');
printLink.rel = 'stylesheet';
printLink.type = 'text/css';
printLink.href = window.location.search.match(/print-pdf/)
  ? '//cdnjs.cloudflare.com/ajax/libs/reveal.js/3.3.0/css/print/pdf.min.css'
  : '//cdnjs.cloudflare.com/ajax/libs/reveal.js/3.3.0/css/print/paper.min.css';
document.querySelector('head').appendChild(printLink);

const markdownTemplate = document.querySelector('[data-markdown] script[type=\'text/template\']');

Reveal.initialize({
  'controls':     true,
  'progress':     true,
  'history':      true,
  'center':       true,
  'theme':        Reveal.getQueryHash().theme,
  'transition':   Reveal.getQueryHash().transition || 'default',
  'dependencies': [{
    'src':       '//cdnjs.cloudflare.com/ajax/libs/reveal.js/3.3.0/lib/js/classList.min.js',
    'condition': () => !document.body.classList,
  }, {
    'src':       '//cdnjs.cloudflare.com/ajax/libs/reveal.js/3.3.0/plugin/markdown/marked.min.js',
    'condition': () => !!markdownTemplate,
    'callback':  () => {
      const renderer = new marked.Renderer();
      const defaultRendererCode = renderer.code;
      renderer.code = function renderCode(code, language) {
        if (language == 'mermaid') {
          return '<div class=mermaid>' + code + '</div>';
        }
        return defaultRendererCode.apply(this, arguments);
      };
      marked.setOptions({'renderer': renderer});
    }
  }, {
    'src':       '//cdnjs.cloudflare.com/ajax/libs/reveal.js/3.3.0/plugin/markdown/markdown.min.js',
    'condition': () => !!markdownTemplate,
  }, {
    'src':      '//cdnjs.cloudflare.com/ajax/libs/reveal.js/3.3.0/plugin/highlight/highlight.min.js',
    'async':    true,
    'callback': () => hljs.initHighlightingOnLoad(),
  }, {
    'src':   '//cdnjs.cloudflare.com/ajax/libs/reveal.js/3.3.0/plugin/zoom-js/zoom.min.js',
    'async': true
  }, {
    'src':   '//cdnjs.cloudflare.com/ajax/libs/reveal.js/3.3.0/plugin/notes/notes.min.js',
    'async': true
  }]
});
