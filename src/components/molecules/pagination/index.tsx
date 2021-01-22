import classnames from 'classnames'
import Link from 'next/link'

import styles from '@/styles/components/pagination/index.module.css'

type PaginationLinkProps = {
  hrefFormat: string
  page: number
}

const PaginationLink = function PaginationLink({
  hrefFormat,
  page
}: PaginationLinkProps) {
  return (
    <span className={classnames(styles.paginationLink)}>
      <Link href={hrefFormat.replace('{page}', String(page))}>
        {String(page)}
      </Link>
    </span>
  )
}

type PaginationProps = {
  hrefFormat: string
  itemCount: number
  page: number
  pageSize: number
}

const Pagination = function Pagination({
  hrefFormat,
  itemCount,
  page,
  pageSize
}: PaginationProps) {
  const prevPage = page - 1
  const nextPage = page + 1
  const firstPage = 1
  const lastPage = Math.ceil(itemCount / pageSize)

  return (
    <nav>
      <ul className={classnames(styles.pagination)}>
        {page === firstPage ? (
          <></>
        ) : (
          <li>
            <PaginationLink hrefFormat={hrefFormat} page={firstPage} />
          </li>
        )}
        {page - firstPage <= 2 ? (
          <></>
        ) : (
          <li>
            <span className={classnames(styles.paginationEllip)}>&hellip;</span>
          </li>
        )}
        {page - firstPage <= 1 ? (
          <></>
        ) : (
          <li>
            <PaginationLink hrefFormat={hrefFormat} page={prevPage} />
          </li>
        )}
        <li>
          <span className={classnames(styles.paginationCurrentLink)}>
            {page}
          </span>
        </li>
        {lastPage - page <= 1 ? (
          <></>
        ) : (
          <li>
            <PaginationLink hrefFormat={hrefFormat} page={nextPage} />
          </li>
        )}
        {lastPage - page <= 2 ? (
          <></>
        ) : (
          <li>
            <span className={classnames(styles.paginationEllip)}>&hellip;</span>
          </li>
        )}
        {lastPage === page ? (
          <></>
        ) : (
          <li>
            <PaginationLink hrefFormat={hrefFormat} page={lastPage} />
          </li>
        )}
      </ul>
    </nav>
  )
}

export default Pagination
