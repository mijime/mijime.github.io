import Tag from '@/components/atoms/tag'

type TagListProps = {
  tags: string[]
  date: string
}

export default function TagList({ tags, date }: TagListProps) {
  return (
    <div className="tags level-item is-right has-addons">
      {tags.map((tag: string) => (
        <Tag key={tag} tag={tag} />
      ))}
      <span className="tag is-rounded">{date}</span>
    </div>
  )
}
