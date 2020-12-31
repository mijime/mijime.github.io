import Head from 'next/head'
import { PropsWithChildren } from 'react'
import { buildMetadataByFrontMatter } from '@/lib/markdown'
import { SITE_NAME } from '@/lib/config'
import ArticleCard from '@/components/article-card'

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
          {metadata.title} | {SITE_NAME}
        </title>
      </Head>
      <ArticleCard
        title={metadata.title}
        date={metadata.date}
        tags={metadata.tags.map((tag: string) => tag.toLowerCase())}
      >
        {children}
      </ArticleCard>
    </>
  )
}
