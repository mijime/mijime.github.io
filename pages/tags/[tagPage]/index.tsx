import { GetStaticPaths, GetStaticProps } from 'next'

import { PostsApp } from '@/applications/posts/'
import { SitesApp } from '@/applications/sites/'
import { TagsPage, TagsPageProps } from '@/components/pages/tags/'

export default TagsPage

export const getStaticProps: GetStaticProps<TagsPageProps> =
  async function getStaticProps({ params }) {
    const siteName = SitesApp.getSiteName()
    const pageSize = SitesApp.getPageSize()
    const page = Number(params?.tagPage)

    const { tagCounts, count } = await PostsApp.fetchTagCountsByPage({
      page,
      pageSize
    })

    return {
      props: { siteName, page, pageSize, tags: tagCounts, tagCount: count }
    }
  }

export const getStaticPaths: GetStaticPaths = async function getStaticPaths() {
  const pageSize = SitesApp.getPageSize()
  const { count } = await PostsApp.fetchTagCounts()

  return {
    paths: [...Array(Math.ceil(count / pageSize)).keys()].map(
      page => `/tags/${page + 1}`
    ),
    fallback: false
  }
}
