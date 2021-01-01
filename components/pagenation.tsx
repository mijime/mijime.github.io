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
  const prevPage = page - 1
  const nextPage = page + 1
  const firstPage = 1
  const lastPage = Math.ceil(itemCount / PAGE_SIZE)
  return (
    <nav className="pagination is-centered pt-4" role="navigation">
      <ul className="pagination-list">
        {page !== firstPage ? (
          <li>
            <span className="pagination-link">
              <Link href={`${linkPrefix}/${firstPage}`}>{'' + firstPage}</Link>
            </span>
          </li>
        ) : (
          <></>
        )}
        {page - firstPage > 2 ? (
          <li>
            <span className="pagination-ellipsis">&hellip;</span>
          </li>
        ) : (
          <></>
        )}
        {page - firstPage > 1 ? (
          <li>
            <span className="pagination-link">
              <Link href={`${linkPrefix}/${prevPage}`}>{'' + prevPage}</Link>
            </span>
          </li>
        ) : (
          <></>
        )}
        <li>
          <span className="pagination-link is-current">{page}</span>
        </li>
        {lastPage - page > 1 ? (
          <li>
            <span className="pagination-link">
              <Link href={`${linkPrefix}/${nextPage}`}>{'' + nextPage}</Link>
            </span>
          </li>
        ) : (
          <></>
        )}
        {lastPage - page > 2 ? (
          <li>
            <span className="pagination-ellipsis">&hellip;</span>
          </li>
        ) : (
          <></>
        )}
        {lastPage !== page ? (
          <li>
            <span className="pagination-link">
              <Link href={`${linkPrefix}/${lastPage}`}>{'' + lastPage}</Link>
            </span>
          </li>
        ) : (
          <></>
        )}
      </ul>
    </nav>
  )
}
