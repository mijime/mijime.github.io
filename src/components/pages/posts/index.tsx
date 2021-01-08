import Head from 'next/head'

import Pagination from '@/components/molecules/pagination/'
import ArticleList from '@/components/organisms/article-list/'
import { ListPageProps } from '@/components/templates/'
import DefaultLayout from '@/components/templates/default/'
import { Post } from '@/domains/entities/posts/'

export type PostsPageProps = ListPageProps & {
  posts: Post[]
  postCount: number
}

export const PostsPage = function PostsPage({
  siteName,
  page,
  pageSize,
  posts,
  postCount
}: PostsPageProps) {
  return (
    <DefaultLayout siteName={siteName}>
      <Head>
        <title>
          Posts by page {page} | {siteName}
        </title>
      </Head>
      <ArticleList posts={posts} />
      <Pagination
        hrefFormat="/posts/{page}/"
        itemCount={postCount}
        page={page}
        pageSize={pageSize}
      />
    </DefaultLayout>
  )
}
