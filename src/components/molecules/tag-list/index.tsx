import Link from 'next/link'
import Tag from '@/components/atoms/tag/'
import { humanReadableDate } from '@/infrastructures/functions/date'

type TagListProps = {
  tags: string[]
  date: string
}

export default function TagList({ tags, date }: TagListProps) {
  return (
    <div className="flex justify-end">
      {tags.map((tag: string) => (
        <Tag key={tag} className="bg-blue-200 border-blue-200 text-blue-600">
          <Link href={`/tag/${tag}/posts/1/`}>{tag}</Link>
        </Tag>
      ))}
      <Tag className="bg-gray-200 border-gray-200 text-gray-600">
        {humanReadableDate(new Date(date))}
      </Tag>
    </div>
  )
}
