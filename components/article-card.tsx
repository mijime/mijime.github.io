import { PropsWithChildren } from 'react'
import Link from 'next/link'

type ArticleCardProps = {
  title: string
  date: Date
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
            <div className="tags level-item has-addons">
              {tags.map((tag: string) => (
                <span key={tag} className="tag is-rounded is-info">
                  <Link href={`/tag/${tag}/1`}>{tag}</Link>
                </span>
              ))}
              <span className="tag is-rounded">{date}</span>
            </div>
          </div>
        </div>
        <div className="content article-body pt-8">{children}</div>
      </div>
    </div>
  )
}
