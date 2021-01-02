import Document, { Html, Head, Main, NextScript } from 'next/document'
import DefaultLayout from '@/components/templates/default'
import GoogleAnalyticsScript from '@/components/functions/google-analytics-script'
import { AnalyticsApp } from '@/applications/analytics'
import { SitesApp } from '@/applications/sites'

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
          <DefaultLayout siteName={SitesApp.getSiteName()}>
            <Main />
          </DefaultLayout>
          <NextScript />
        </body>
      </Html>
    )
  }
}
