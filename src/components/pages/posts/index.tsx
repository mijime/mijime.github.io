import Head from 'next/head'
import Pagination from '@/components/molecules/pagination'
import ArticleList from '@/components/organisms/article-list'
import { ListPageProps } from '@/components/templates/'
import { Post } from '@/domains/entities/posts'

export type PostsPageProps = ListPageProps & {
  posts: Post[]
  postCount: number
}

export function PostsPage({
  siteName,
  page,
  pageSize,
  posts,
  postCount
}: PostsPageProps) {
  return (
    <>
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
    </>
  )
}
