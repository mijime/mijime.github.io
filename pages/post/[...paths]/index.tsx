import { GetStaticPaths, GetStaticProps } from 'next'
import { serialize } from 'next-mdx-remote/serialize'
import highlight from 'remark-highlight.js'

import { PostsApp } from '@/applications/posts/'
import { SitesApp } from '@/applications/sites/'
import { PostPage, PostPageProps } from '@/components/pages/post/'

export default PostPage

export const getStaticProps: GetStaticProps<PostPageProps> =
  async function getStaticProps({ params }) {
    const siteName = SitesApp.getSiteName()
    const slug = (params?.paths as string[]).join('/')
    const post = await PostsApp.fetchPostBySlug(slug)

    const source = await serialize(post.content, {
      mdxOptions: {
        remarkPlugins: [() => highlight({ exclude: ['mermaid'] })]
      }
    })

    return { props: { siteName, source, post } }
  }

export const getStaticPaths: GetStaticPaths = async function getStaticPaths() {
  const { slugs } = await PostsApp.fetchSlugs()

  return {
    paths: slugs.map(slug => `/post/${slug}`),
    fallback: false
  }
}
