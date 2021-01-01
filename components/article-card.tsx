import { PropsWithChildren } from 'react'
import Link from 'next/link'
import { PostData } from '@/lib/posts'
import TagList from '@/components/tag-list'

export default function ArticleCard({
  title,
  date,
  tags = [],
  children
}: PropsWithChildren<PostData>) {
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
