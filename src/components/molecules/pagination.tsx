import Link from 'next/link'

type PaginationLinkProps = {
  hrefFormat: string
  page: number
}

function PaginationLink({ hrefFormat, page }: PaginationLinkProps) {
  return (
    <span className="pagination-link">
      <Link href={hrefFormat.replace('{page}', '' + page)}>{'' + page}</Link>
    </span>
  )
}

type PaginationProps = {
  hrefFormat: string
  itemCount: number
  page: number
  pageSize: number
}

export default function Pagination({
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
    <nav className="pagination is-centered pt-4" role="navigation">
      <ul className="pagination-list">
        {page !== firstPage ? (
          <li>
            <PaginationLink hrefFormat={hrefFormat} page={firstPage} />
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
            <PaginationLink hrefFormat={hrefFormat} page={prevPage} />
          </li>
        ) : (
          <></>
        )}
        <li>
          <span className="pagination-link is-current">{page}</span>
        </li>
        {lastPage - page > 1 ? (
          <li>
            <PaginationLink hrefFormat={hrefFormat} page={nextPage} />
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
            <PaginationLink hrefFormat={hrefFormat} page={lastPage} />
          </li>
        ) : (
          <></>
        )}
      </ul>
    </nav>
  )
}
