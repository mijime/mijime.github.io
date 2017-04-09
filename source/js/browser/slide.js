const revealCdn = 'cdnjs.cloudflare.com/ajax/libs/reveal.js/3.4.1';

const printLink = document.createElement('link');
printLink.rel = 'stylesheet';
printLink.type = 'text/css';
printLink.href = window.location.search.match(/print-pdf/)
  ? `//${revealCdn}/css/print/pdf.min.css`
  : `//${revealCdn}/css/print/paper.min.css`;
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
    'src':       `//${revealCdn}/lib/js/classList.min.js`,
    'condition': () => !document.body.classList,
  }, {
    'src':       `//${revealCdn}/plugin/markdown/marked.js`,
    'condition': () => !!markdownTemplate,
    'callback':  () => {
      const renderer = new marked.Renderer();
      const defaultRendererCode = renderer.code;
      renderer.code = function renderCode(code, language) {
        if (language === 'mermaid') {
          return `<div class="mermaid">${code}</div>`;
        }

        return defaultRendererCode.apply(this, arguments);
      };
      marked.setOptions({'renderer': renderer});
    }
  }, {
    'src':       `//${revealCdn}/plugin/markdown/markdown.min.js`,
    'condition': () => !!markdownTemplate,
  }, {
    'src':      `//${revealCdn}/plugin/highlight/highlight.min.js`,
    'async':    true,
    'callback': () => hljs.initHighlightingOnLoad(),
  }, {
    'src':   `//${revealCdn}/plugin/zoom-js/zoom.min.js`,
    'async': true
  }, {
    'src':   `//${revealCdn}/plugin/notes/notes.min.js`,
    'async': true
  }]
});
