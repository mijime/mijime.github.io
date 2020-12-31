import { AppProps } from 'next/app'
import Link from 'next/link'
import { MDXProvider } from '@mdx-js/react'
import '@/components/progress'

import 'highlight.js/styles/github.css'
import '@/styles/index.css'
import 'nprogress/nprogress.css'

export default function MainApp({ Component, pageProps }: AppProps) {
  return (
    <MDXProvider components={{ a: Link }}>
      <Component {...pageProps} />
    </MDXProvider>
  )
}
