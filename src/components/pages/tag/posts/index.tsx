import Head from 'next/head'
import Pagination from '@/components/molecules/pagination/'
import ArticleList from '@/components/organisms/article-list/'
import { ListPageProps } from '@/components/templates/'
import { Post, Tag } from '@/domains/entities/posts/'

export type PostsByTagPageProps = ListPageProps & {
  tag: Tag
  posts: Post[]
  postCount: number
}

export function PostsByTagPage({
  siteName,
  page,
  pageSize,
  tag,
  posts,
  postCount
}: PostsByTagPageProps) {
  return (
    <>
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
    </>
  )
}
