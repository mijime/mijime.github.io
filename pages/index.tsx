import { GetStaticProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { SITE_NAME, PAGE_SIZE } from '@/lib/config'
import { fetchAllPosts, PostData } from '@/lib/posts'
import ArticleCard from '@/components/article-card'
import ArticleList from '@/components/article-list'
import Pagination from '@/components/pagination'

type IndexProps = {
  posts: PostData[]
  postCount: number
}

export default function Index({ posts, postCount }: IndexProps) {
  return (
    <>
      <Head>{SITE_NAME}</Head>
      <div className="block">
        <ArticleCard {...posts[0]}>
          <p className="message">{posts[0].content.slice(0, 100)}</p>
          <p>
            <Link href={`/post/${posts[0].slug}`}>Read more</Link>
          </p>
        </ArticleCard>
      </div>
      <ArticleList posts={posts.slice(1)} />
      <Pagination linkPrefix="/posts" page={1} itemCount={postCount} />
    </>
  )
}

export const getStaticProps: GetStaticProps<IndexProps> = async function () {
  const allPosts = await fetchAllPosts()
  const topPagePosts = allPosts.slice(0, PAGE_SIZE)

  return {
    props: { posts: topPagePosts, postCount: allPosts.length }
  }
}
