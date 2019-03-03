---
Title: "vim-lspはじめました"
Draft: false
Description: ""
Tags: ["development"]
Date: "2019-02-28T01:49:54+09:00"
---

今まで `faith/vim-go` をありがたく使わせてもらっていたけど
`GO111MODULE=on` のときの挙動が気になったので `prabirshrestha/vim-lsp` に移行した

<!--more-->

1. Wikiに全部書いてあるのでそれをコピる

2. `go get -u github.com/saibing/bingo` でbingoをインストールしておく

3. `<C-]>` などのkey mappingを設定する

```vimrc
" ...
Plug 'prabirshrestha/async.vim'
Plug 'prabirshrestha/vim-lsp'
if executable('bingo')
    augroup LspGo
        au!
        autocmd User lsp_setup call lsp#register_server({
            \ 'name': 'go-lang',
            \ 'cmd': {server_info->['bingo', '-mode', 'stdio']},
                      \ 'whitelist': ['go'],
                                  \ })
        autocmd FileType go setlocal noexpandtab
        autocmd FileType go setlocal omnifunc=lsp#complete
        autocmd FileType go nmap <C-]> :LspDefinition<CR>
        autocmd FileType go nmap K :LspHover<CR>
        autocmd FileType go nmap ]] :LspDocumentSymbol<CR>
        autocmd BufWritePre *.go LspDocumentFormatSync
    augroup END
endif
" ...
```
