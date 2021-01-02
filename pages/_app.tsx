import { AppProps } from 'next/app'
import Link from 'next/link'
import Image from 'next/image'
import { MDXProvider } from '@mdx-js/react'

import { AnalyticsApp } from '@/applications/analytics'
import '@/components/functions/progress'
import GoogleAnalyticsRouter from '@/components/functions/google-analytics-router'

import 'bulma/css/bulma.css'
import 'highlight.js/styles/github.css'
import 'nprogress/nprogress.css'
import '@/styles/index.css'

export default function MainApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <GoogleAnalyticsRouter trackingID={AnalyticsApp.getTrackingID()} />
      <MDXProvider components={{ a: Link, img: Image }}>
        <Component {...pageProps} />
      </MDXProvider>
    </>
  )
}
