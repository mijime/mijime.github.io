import Link from 'next/link'
import { PropsWithChildren } from 'react'
import Card from '@/components/atoms/card/'
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
    <Card>
      <h1 className="py-2 text-gray-800 text-lg text-center">
        <Link href={`/${slug}/`}>{title}</Link>
      </h1>
      <TagList tags={tags} date={date} />
      <div className="text-gray-600 py-2 overflow-x-hidden">{children}</div>
    </Card>
  )
}
