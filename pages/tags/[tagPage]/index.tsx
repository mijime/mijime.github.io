import { GetStaticPaths, GetStaticProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { SITE_NAME, PAGE_SIZE } from '@/lib/config'
import { fetchAllTags } from '@/lib/posts'

type TagsByPageProps = {
  tags: Array<{ name: string; count: number }>
  page: number
  hasPrev: boolean
  hasNext: boolean
}

export default function TagsByPage({
  tags,
  page,
  hasPrev,
  hasNext
}: TagsByPageProps) {
  const pagination = [
    hasPrev ? <Link href={`/tags/${page - 1}`}> Prev </Link> : [],
    hasNext ? <Link href={`/tags/${page + 1}`}> Next </Link> : []
  ]
  return (
    <>
      <Head>
        <title>
          Tags {page} | {SITE_NAME}
        </title>
      </Head>
      {tags.map(({ name, count }) => (
        <Link key={name} href={`/tag/${name}/1`}>{`${name} (${count})`}</Link>
      ))}
      {pagination}
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
  const hasNext = page * PAGE_SIZE < allTags.length
  const hasPrev = page !== 1

  return {
    props: { tags, page, hasPrev, hasNext }
  }
}
