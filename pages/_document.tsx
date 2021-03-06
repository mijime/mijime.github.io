import Document, { Head, Html, Main, NextScript } from 'next/document'

import { AnalyticsApp } from '@/applications/analytics/'
import { SitesApp } from '@/applications/sites/'
import GoogleAnalyticsScript from '@/components/functions/google-analytics/script/'

export default class RootDocument extends Document {
  render() {
    return (
      <Html lang={SitesApp.getLangugage()}>
        <Head>
          <link rel="icon" href="/favicon.png" />
          <meta
            name="google-site-verification"
            content={SitesApp.getSiteVerification()}
          />
          <GoogleAnalyticsScript trackingID={AnalyticsApp.getTrackingID()} />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}
