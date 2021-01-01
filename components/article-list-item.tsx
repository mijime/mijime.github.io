import Link from 'next/link'
import TagList from '@/components/tag-list'

export type ArticleListItemProps = {
  title: string
  slug: string
  date: string
  tags: string[]
}

export default function ArticleListItem({
  title,
  slug,
  date,
  tags = []
}: ArticleListItemProps) {
  return (
    <div className="block card">
      <div className="card-content is-small">
        <Link href={`/post/${slug}`}>{title}</Link>
        <TagList tags={tags} date={date} />
      </div>
    </div>
  )
}
