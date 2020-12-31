import Document, { Html, Head, Main, NextScript } from 'next/document'
import DefaultLayout from '@/layouts/default'
import { GA_TRACKING_ID, SITE_VERIFICATION } from '@/lib/config'

export default class RootDocument extends Document {
  render() {
    return (
      <Html lang="ja">
        <Head>
          <link rel="icon" href="/favicon.png" />
          <meta name="google-site-verification" content={SITE_VERIFICATION} />
          <script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
          />
          <script
            dangerouslySetInnerHTML={{
              __html: `
window.dataLayer = window.dataLayer || [];
window.gtag = function(){dataLayer.push(arguments);}
window.gtag('js', new Date());
window.gtag('config', '${GA_TRACKING_ID}', {page_path: window.location.pathname});
`
            }}
          />
        </Head>
        <body>
          <DefaultLayout>
            <Main />
          </DefaultLayout>
          <NextScript />
        </body>
      </Html>
    )
  }
}
