import Link from 'next/link'
import { PAGE_SIZE } from '@/lib/config'

interface PagenationProps {
  linkPrefix: string
  itemCount: number
  page: number
}

export default function Pagenation({
  linkPrefix,
  page,
  itemCount
}: PagenationProps) {
  const hasNext = page * PAGE_SIZE < itemCount
  const hasPrev = page !== 1
  return (
    <div className="columns">
      {[
        hasPrev ? (
          <span className="column">
            <Link key="prev" href={`${linkPrefix}/${page - 1}`}>
              Prev
            </Link>
          </span>
        ) : (
          <></>
        ),
        hasNext ? (
          <span className="column is-right has-text-right">
            <Link key="next" href={`${linkPrefix}/${page + 1}`}>
              Next
            </Link>
          </span>
        ) : (
          <></>
        )
      ]}
    </div>
  )
}
