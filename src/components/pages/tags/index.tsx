import Head from 'next/head'
import Pagination from '@/components/molecules/pagination/'
import Tag from '@/components/atoms/tag/'
import { ListPageProps } from '@/components/templates/'

type TagCountItemProps = {
  tag: string
  count: number
}

function TagCountItem({ tag, count }: TagCountItemProps) {
  return (
    <div className="tags level-item has-addons is-right">
      <Tag tag={tag} />
      <span className="tag is-rounded">{count}</span>
    </div>
  )
}

function TagCountList({ tags }: { tags: { name: string; count: number }[] }) {
  return (
    <div className="block">
      {tags.map(({ name, count }) => (
        <TagCountItem key={name} tag={name} count={count} />
      ))}
    </div>
  )
}

export type TagsPageProps = ListPageProps & {
  tags: Array<{ name: string; count: number }>
  tagCount: number
}

export function TagsPage({
  siteName,
  page,
  pageSize,
  tags,
  tagCount
}: TagsPageProps) {
  return (
    <>
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
    </>
  )
}
