import Link from 'next/link'
import { PostData } from '@/lib/posts'

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
        <div className="tags level-item is-right has-addons">
          {tags.map(tag => (
            <span key={tag} className="tag is-rounded is-info">
              <Link href={`/tag/${tag}/1`}>{tag}</Link>
            </span>
          ))}
          <span className="tag is-rounded">{date}</span>
        </div>
      </div>
    </div>
  )
}
