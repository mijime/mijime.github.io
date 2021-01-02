import { PropsWithChildren } from 'react'
import Head from 'next/head'

import { SitesApp } from '@/applications/sites/'
import ArticleCard from '@/components/molecules/article-card/'
import { buildMetadataByFrontMatter } from '@/infrastructures/functions/markdown/'

type IndexLayoutProps = {
  frontMatter: { [key: string]: any }
}

export default function IndexLayout({
  frontMatter,
  children
}: PropsWithChildren<IndexLayoutProps>) {
  const metadata = buildMetadataByFrontMatter(frontMatter)
  return (
    <>
      <Head>
        <title>
          {metadata.title} | {SitesApp.getSiteName()}
        </title>
      </Head>
      <ArticleCard {...metadata}>{children}</ArticleCard>
    </>
  )
}
