import { GetStaticPaths, GetStaticProps } from 'next'
import Head from 'next/head'
import { SITE_NAME, PAGE_SIZE } from '@/lib/config'
import { fetchAllTags, fetchPostsByTag, PostData } from '@/lib/posts'
import ArticleList from '@/components/article-list'
import Pagination from '@/components/pagination'

type PostsByTagAndPageProps = {
  posts: PostData[]
  postCount: number
  page: number
  tagName: string
}

export default function PostsByTagAndPage({
  posts,
  postCount,
  page,
  tagName
}: PostsByTagAndPageProps) {
  return (
    <>
      <Head>
        <title>
          Tag {tagName}: {page} | {SITE_NAME}
        </title>
      </Head>
      <ArticleList posts={posts} />
      <Pagination
        linkPrefix={`/tag/${tagName}`}
        itemCount={postCount}
        page={page}
        pageSize={PAGE_SIZE}
      />
    </>
  )
}

export const getStaticPaths: GetStaticPaths = async function (context) {
  const allTags = await fetchAllTags()

  return {
    paths: allTags
      .map(({ name, count }) =>
        [...Array(Math.ceil(count / PAGE_SIZE)).keys()].map(
          page => `/tag/${name}/${page + 1}`
        )
      )
      .flat(),
    fallback: false
  }
}

export const getStaticProps: GetStaticProps<PostsByTagAndPageProps> = async function ({
  params
}) {
  const tagName = String(params?.tag as string)
  const page = Number(params?.page as string)

  const postsByTag = await fetchPostsByTag(tagName)
  const posts = postsByTag.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const postCount = postsByTag.length

  return {
    props: { posts, postCount, page, tagName }
  }
}
