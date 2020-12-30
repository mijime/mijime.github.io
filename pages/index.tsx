import { GetStaticProps } from 'next'
import Head from 'next/head'
import { SITE_NAME, PAGE_SIZE } from '@/lib/config'
import { fetchAllPosts, PostData } from '@/lib/posts'
import ArticleList from '@/components/article-list'
import Pagenation from '@/components/pagenation'

interface IndexProps {
  posts: PostData[]
  postCount: number
}

export default function Index({ posts, postCount }: IndexProps) {
  return (
    <>
      <Head>{SITE_NAME}</Head>
      <ArticleList posts={posts} />
      <Pagenation linkPrefix="/posts" page={1} itemCount={postCount} />
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
