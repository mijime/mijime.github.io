import { PropsWithChildren } from 'react'
import Head from 'next/head'

import { SitesApp } from '@/applications/sites/'
import ArticleCard from '@/components/molecules/article-card/'
import { buildMetadataByFrontMatter } from '@/infrastructures/functions/markdown/'
import DefaultLayout from '@/components/templates/default/'

type PostPageProps = {
  frontMatter: { [key: string]: any }
}

export default function PostPage({
  frontMatter,
  children
}: PropsWithChildren<PostPageProps>) {
  const metadata = buildMetadataByFrontMatter(frontMatter)
  const siteName = SitesApp.getSiteName()
  return (
    <DefaultLayout siteName={siteName}>
      <Head>
        <title>
          {metadata.title} | {siteName}
        </title>
      </Head>
      <ArticleCard {...metadata}>{children}</ArticleCard>
    </DefaultLayout>
  )
}
