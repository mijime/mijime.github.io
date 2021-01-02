import { GetStaticProps, GetStaticPaths } from 'next'
import {
  PostsByTagPage,
  PostsByTagPageProps
} from '@/components/pages/tag/posts/'
import { PostsApp } from '@/applications/posts/'
import { SitesApp } from '@/applications/sites/'

export default PostsByTagPage

export const getStaticProps: GetStaticProps<PostsByTagPageProps> = async function ({
  params
}) {
  const siteName = SitesApp.getSiteName()
  const pageSize = SitesApp.getPageSize()
  const tag = String(params?.tagName as string)
  const page = Number(params?.postPage as string)

  const { posts, count } = await PostsApp.fetchPostsByTagAndPage({
    tag,
    page,
    pageSize
  })

  return {
    props: { siteName, page, pageSize, tag, posts, postCount: count }
  }
}

export const getStaticPaths: GetStaticPaths = async function (context) {
  const pageSize = SitesApp.getPageSize()
  const { tagCounts } = await PostsApp.fetchTagCounts()

  return {
    paths: tagCounts
      .map(({ name, count }) =>
        [...Array(Math.ceil(count / pageSize)).keys()].map(
          page => `/tag/${name}/posts/${page + 1}/`
        )
      )
      .flat(),
    fallback: false
  }
}
