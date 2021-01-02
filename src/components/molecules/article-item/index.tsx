import Link from 'next/link'
import TagList from '@/components/molecules/tag-list/'

export type ArticleItemProps = {
  title: string
  slug: string
  date: string
  tags: string[]
}

export default function ArticleItem({
  title,
  slug,
  date,
  tags = []
}: ArticleItemProps) {
  return (
    <div className="article">
      <div className="card">
        <div className="card-content">
          <div className="article-title">
            <Link href={`/post/${slug}`}>{title}</Link>
            <TagList tags={tags} date={date} />
          </div>
        </div>
      </div>
    </div>
  )
}
