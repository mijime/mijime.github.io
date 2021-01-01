import Link from 'next/link'
import { PostData } from '@/lib/posts'
import TagList from '@/components/tag-list'

type ArticleListItemProps = PostData

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
