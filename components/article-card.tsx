import { PropsWithChildren } from 'react'
import TagList from '@/components/tag-list'

type ArticleCardProps = {
  title: string
  date: string
  tags: string[]
}

export default function ArticleCard({
  title,
  date,
  tags = [],
  children
}: PropsWithChildren<ArticleCardProps>) {
  return (
    <div className="article card">
      <div className="card-content">
        <div className="article-title">
          <div className="has-text-centered">
            <p className="title">{title}</p>
            <TagList tags={tags} date={date} />
          </div>
        </div>
        <div className="content article-body pt-8">{children}</div>
      </div>
    </div>
  )
}
