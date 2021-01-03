import Link from 'next/link'

type PaginationLinkProps = {
  hrefFormat: string
  page: number
}

function PaginationLink({ hrefFormat, page }: PaginationLinkProps) {
  return (
    <span className="border-gray-100 bg-gray-200 text-gray-600 px-4 py-3 border-2 rounded-sm">
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
    <nav>
      <ul className="flex justify-center space-x-2 py-2">
        {page !== firstPage ? (
          <li>
            <PaginationLink hrefFormat={hrefFormat} page={firstPage} />
          </li>
        ) : (
          <></>
        )}
        {page - firstPage > 2 ? (
          <li>
            <span className="px-2 text-gray-400">&hellip;</span>
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
          <span className="border-blue-100 bg-blue-200 text-blue-400 px-4 py-3 border-2 rounded-sm">
            {page}
          </span>
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
            <span className="px-2 text-gray-400">&hellip;</span>
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
