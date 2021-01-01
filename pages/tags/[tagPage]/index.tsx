import { GetStaticPaths, GetStaticProps } from 'next'
import Head from 'next/head'
import { SITE_NAME, PAGE_SIZE } from '@/lib/config'
import { fetchAllTags } from '@/lib/posts'
import Pagination from '@/components/pagination'
import Tag from '@/components/tag'

type TagCountProps = {
  tag: string
  count: number
}

function TagCount({ tag, count }: TagCountProps) {
  return (
    <div className="tags level-item has-addons is-right">
      <Tag tag={tag} />
      <span className="tag is-rounded">{count}</span>
    </div>
  )
}

type TagsByPageProps = {
  tags: Array<{ name: string; count: number }>
  tagCount: number
  page: number
}

export default function TagsByPage({ tags, tagCount, page }: TagsByPageProps) {
  return (
    <>
      <Head>
        <title>
          Tags {page} | {SITE_NAME}
        </title>
      </Head>
      <div className="block">
        {tags.map(({ name, count }) => (
          <TagCount key={name} tag={name} count={count} />
        ))}
      </div>
      <Pagination
        linkPrefix="/tags"
        itemCount={tagCount}
        page={page}
        pageSize={PAGE_SIZE}
      />
    </>
  )
}

export const getStaticPaths: GetStaticPaths = async function (context) {
  const allTags = await fetchAllTags()
  const pageSize = Math.ceil(allTags.length / PAGE_SIZE)

  return {
    paths: [...Array(pageSize).keys()].map(page => `/tags/${page + 1}`),
    fallback: false
  }
}

export const getStaticProps: GetStaticProps<TagsByPageProps> = async function ({
  params
}) {
  const allTags = await fetchAllTags()
  const page: number = Number(params?.tagPage)
  const tags = allTags.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const tagCount = allTags.length

  return {
    props: { tags, tagCount, page }
  }
}
