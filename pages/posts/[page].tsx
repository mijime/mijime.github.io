import { GetStaticPaths, GetStaticProps } from 'next'
import Head from 'next/head'
import { SITE_NAME, PAGE_SIZE } from '@/lib/config'
import { fetchAllPosts, PostData } from '@/lib/posts'
import ArticleList from '@/components/article-list'
import Pagination from '@/components/pagination'

type PostsByPageProps = {
  posts: PostData[]
  postCount: number
  page: number
}

export default function PostsByPage({
  posts,
  postCount,
  page
}: PostsByPageProps) {
  return (
    <>
      <Head>
        <title>
          Posts: {page} | {SITE_NAME}
        </title>
      </Head>
      <ArticleList posts={posts} />
      <Pagination linkPrefix="/posts" page={page} itemCount={postCount} />
    </>
  )
}

export const getStaticPaths: GetStaticPaths = async function (context) {
  const allPosts = await fetchAllPosts()
  const pageSize = Math.ceil(allPosts.length / PAGE_SIZE)

  return {
    paths: [...Array(pageSize).keys()].map(page => `/posts/${page + 1}`),
    fallback: false
  }
}

export const getStaticProps: GetStaticProps<PostsByPageProps> = async function ({
  params
}) {
  const allPosts = await fetchAllPosts()
  const page: number = Number(params?.page)
  const posts = allPosts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const postCount = allPosts.length

  return {
    props: { posts, postCount, page }
  }
}
