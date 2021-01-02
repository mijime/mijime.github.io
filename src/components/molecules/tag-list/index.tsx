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
        <Tag key={tag} color="blue">
          <Link href={`/tag/${tag}/posts/1/`}>{tag}</Link>
        </Tag>
      ))}
      <Tag color="gray">{humanReadableDate(new Date(date))}</Tag>
    </div>
  )
}
