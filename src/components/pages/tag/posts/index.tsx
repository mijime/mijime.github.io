import Head from 'next/head'

import Pagination from '@/components/molecules/pagination/'
import ArticleList from '@/components/organisms/article-list/'
import { ListPageProps } from '@/components/templates/'
import DefaultLayout from '@/components/templates/default/'
import { Post, Tag } from '@/domains/entities/posts/'

export type PostsByTagPageProps = ListPageProps & {
  tag: Tag
  posts: Post[]
  postCount: number
}

export const PostsByTagPage = function PostsByTagPage({
  siteName,
  page,
  pageSize,
  tag,
  posts,
  postCount
}: PostsByTagPageProps) {
  return (
    <DefaultLayout siteName={siteName}>
      <Head>
        <title>
          Tag: {tag} by page {page} | {siteName}
        </title>
      </Head>
      <ArticleList posts={posts} />
      <Pagination
        hrefFormat={`/tag/${tag}/posts/{page}/`}
        itemCount={postCount}
        page={page}
        pageSize={pageSize}
      />
    </DefaultLayout>
  )
}
