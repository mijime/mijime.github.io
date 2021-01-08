import Head from 'next/head'

import ArticleCard from '@/components/molecules/article-card/'
import Pagination from '@/components/molecules/pagination/'
import ArticleList from '@/components/organisms/article-list/'
import { ListPageProps } from '@/components/templates/'
import DefaultLayout from '@/components/templates/default/'
import { Post } from '@/domains/entities/posts/'

export type IndexPageProps = ListPageProps & {
  posts: Post[]
  postCount: number
}

export const IndexPage = function IndexPage({
  siteName,
  page,
  pageSize,
  posts,
  postCount
}: IndexPageProps) {
  return (
    <DefaultLayout siteName={siteName}>
      <Head>
        <title>{siteName}</title>
      </Head>
      <div className="pb-4">
        <ArticleCard {...posts[0]}>
          <div className="message">{posts[0].description}</div>
        </ArticleCard>
      </div>
      <ArticleList posts={posts.slice(1)} />
      <Pagination
        hrefFormat="/posts/{page}/"
        itemCount={postCount}
        page={page}
        pageSize={pageSize}
      />
    </DefaultLayout>
  )
}
