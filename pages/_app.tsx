import { AppProps } from 'next/app'
import Link from 'next/link'
import Image from 'next/image'
import { MDXProvider } from '@mdx-js/react'
import '@/components/progress'

import 'bulma/css/bulma.css'
import 'highlight.js/styles/github.css'
import 'nprogress/nprogress.css'
import '@/styles/index.css'

export default function MainApp({ Component, pageProps }: AppProps) {
  return (
    <MDXProvider components={{ a: Link, img: Image }}>
      <Component {...pageProps} />
    </MDXProvider>
  )
}
