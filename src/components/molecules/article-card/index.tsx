import { PropsWithChildren } from 'react'
import Link from 'next/link'
import TagList from '@/components/molecules/tag-list/'

type ArticleCardProps = {
  slug: string
  title: string
  date: string
  tags: string[]
}

export default function ArticleCard({
  slug,
  title,
  date,
  tags = [],
  children
}: PropsWithChildren<ArticleCardProps>) {
  return (
    <div className="article">
      <div className="card">
        <div className="card-content">
          <div className="article-title">
            <div className="has-text-centered">
              <p className="title">
                <Link href={`/${slug}/`}>{title}</Link>
              </p>
            </div>
            <TagList tags={tags} date={date} />
          </div>
          <div className="article-body pt-8">
            <div className="content">{children}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
