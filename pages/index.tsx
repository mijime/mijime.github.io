import { GetStaticProps } from 'next'

import { PostsApp } from '@/applications/posts/'
import { SitesApp } from '@/applications/sites/'
import { IndexPage, IndexPageProps } from '@/components/pages/'

export default IndexPage

export const getStaticProps: GetStaticProps<IndexPageProps> = async function getStaticProps() {
  const siteName = SitesApp.getSiteName()
  const pageSize = SitesApp.getPageSize()
  const page = 1

  const { posts, count } = await PostsApp.fetchPostsByPage({
    page,
    pageSize
  })

  return {
    props: { siteName, page, pageSize, posts, postCount: count }
  }
}
