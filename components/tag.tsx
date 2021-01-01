import Link from 'next/link'

type TagProps = {
  tag: string
}

export default function Tag({ tag }: TagProps) {
  return (
    <span className="tag is-rounded is-info">
      <Link href={`/tag/${tag}/1`}>{tag}</Link>
    </span>
  )
}
