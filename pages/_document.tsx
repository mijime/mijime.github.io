import Document, { Html, Head, Main, NextScript } from 'next/document'
import DefaultLayout from '@/layouts/default'

export default class RootDocument extends Document {
  render() {
    return (
      <Html lang="ja">
        <Head>
          <link rel="icon" href="/favicon.png" />
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
