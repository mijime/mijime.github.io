import classnames from 'classnames'
import { MDXRemote, MDXRemoteSerializeResult } from 'next-mdx-remote'
import Head from 'next/head'
import { PropsWithChildren } from 'react'

import { SitesApp } from '@/applications/sites/'
import ArticleCard from '@/components/molecules/article-card/'
import DefaultLayout from '@/components/templates/default/'
import { Post } from '@/domains/entities/posts/'
import styles from '@/styles/components/prose/index.module.css'

export type PostPageProps = {
  source: MDXRemoteSerializeResult
  post: Post
}

export const PostPage = ({
  source,
  post
}: PropsWithChildren<PostPageProps>) => {
  const siteName = SitesApp.getSiteName()
  return (
    <DefaultLayout siteName={siteName}>
      <Head>
        <title>
          {post.title} | {siteName}
        </title>
      </Head>
      <ArticleCard {...post}>
        <div className={classnames('prose', styles.prose)}>
          <MDXRemote {...source} />
        </div>
      </ArticleCard>
    </DefaultLayout>
  )
}
