import { MDXProvider } from '@mdx-js/react'
import { AppProps } from 'next/app'
import Link from 'next/link'

import { AnalyticsApp } from '@/applications/analytics/'
import '@/components/functions/progress/'
import GoogleAnalyticsRouter from '@/components/functions/google-analytics/router/'

import '@/styles/index.css'

export default function MainApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <GoogleAnalyticsRouter trackingID={AnalyticsApp.getTrackingID()} />
      <MDXProvider components={{ a: Link }}>
        <Component {...pageProps} />
      </MDXProvider>
    </>
  )
}
