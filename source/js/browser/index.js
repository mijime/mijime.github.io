import mermaid from 'mermaid'
import highlight from 'highlight.js'

Array.prototype.map.call(
  document.querySelectorAll('pre code.language-mermaid'),
  code => {
    const div = document.createElement('div')
    div.setAttribute('class', 'mermaid')
    div.textContent = code.textContent
    code.textContent = ''
    code.appendChild(div)
    return code
  }
)

mermaid.initialize({ startOnLoad: true })
highlight.initHighlightingOnLoad()
