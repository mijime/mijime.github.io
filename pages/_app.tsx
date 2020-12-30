import { AppProps } from 'next/app'
import Link from 'next/link'
import { MDXProvider } from '@mdx-js/react'

import 'highlight.js/styles/github.css'
import '@/styles/index.css'

export default function MainApp({ Component, pageProps }: AppProps) {
  return (
    <MDXProvider components={{ a: Link }}>
      <Component {...pageProps} />
    </MDXProvider>
  )
}
