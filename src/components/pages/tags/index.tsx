import Head from 'next/head'
import Link from 'next/link'

import Tag from '@/components/atoms/tag/'
import Pagination from '@/components/molecules/pagination/'
import { ListPageProps } from '@/components/templates/'
import DefaultLayout from '@/components/templates/default/'

type TagCountItemProps = {
  tag: string
  count: number
}

const TagCountItem = function TagCountItem({ tag, count }: TagCountItemProps) {
  return (
    <Tag className="border-blue-100 bg-blue-200 text-blue-400">
      <Link href={`/tag/${tag}/posts/1/`}>{tag}</Link>
      <span className="rounded-full ml-1 px-2 py-1 border-2 border-blue-100 bg-blue-400 text-blue-100">
        {count}
      </span>
    </Tag>
  )
}

const TagCountList = function TagCountList({
  tags
}: {
  tags: { name: string; count: number }[]
}) {
  return (
    <ul>
      {tags.map(({ name, count }) => (
        <li key={name}>
          <TagCountItem tag={name} count={count} />
        </li>
      ))}
    </ul>
  )
}

export type TagsPageProps = ListPageProps & {
  tags: Array<{ name: string; count: number }>
  tagCount: number
}

export const TagsPage = function TagsPage({
  siteName,
  page,
  pageSize,
  tags,
  tagCount
}: TagsPageProps) {
  return (
    <DefaultLayout siteName={siteName}>
      <Head>
        <title>
          Tags by page ${page} | {siteName}
        </title>
      </Head>
      <TagCountList tags={tags} />
      <Pagination
        hrefFormat="/tags/{page}/"
        itemCount={tagCount}
        page={page}
        pageSize={pageSize}
      />
    </DefaultLayout>
  )
}
