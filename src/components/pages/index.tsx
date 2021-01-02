import Head from 'next/head'
import Link from 'next/link'
import Pagination from '@/components/molecules/pagination'
import ArticleCard from '@/components/molecules/article-card'
import ArticleList from '@/components/organisms/article-list'
import { ListPageProps } from '@/components/templates/'
import { Post } from '@/domains/entities/posts'

export type IndexPageProps = ListPageProps & {
  posts: Post[]
  postCount: number
}

export function IndexPage({
  siteName,
  page,
  pageSize,
  posts,
  postCount
}: IndexPageProps) {
  return (
    <>
      <Head>
        <title>{siteName}</title>
      </Head>
      <div className="block">
        <ArticleCard {...posts[0]}>
          <div className="message">{posts[0].content.slice(0, 100)}</div>
          <Link href={`/post/${posts[0].slug}/`}>Read more</Link>
        </ArticleCard>
      </div>
      <ArticleList posts={posts.slice(1)} />
      <Pagination
        hrefFormat="/posts/{page}/"
        itemCount={postCount}
        page={page}
        pageSize={pageSize}
      />
    </>
  )
}
