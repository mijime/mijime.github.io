export type PageProps = {
  siteName: string
}

export type ListPageProps = PageProps & {
  page: number
  pageSize: number
}
