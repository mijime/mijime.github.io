import { GetStaticPaths, GetStaticProps } from 'next'

import { PostsApp } from '@/applications/posts/'
import { SitesApp } from '@/applications/sites/'
import { PostsPage, PostsPageProps } from '@/components/pages/posts/'

export default PostsPage

export const getStaticProps: GetStaticProps<PostsPageProps> = async function getStaticProps({
  params
}) {
  const siteName = SitesApp.getSiteName()
  const pageSize = SitesApp.getPageSize()
  const page = Number(params?.postPage)

  const { posts, count } = await PostsApp.fetchPostsByPage({
    page,
    pageSize
  })

  return {
    props: { siteName, page, pageSize, posts, postCount: count }
  }
}

export const getStaticPaths: GetStaticPaths = async function getStaticPaths() {
  const pageSize = SitesApp.getPageSize()
  const { count } = await PostsApp.fetchPosts()

  return {
    paths: [...Array(Math.ceil(count / pageSize)).keys()].map(
      page => `/posts/${page + 1}`
    ),
    fallback: false
  }
}
