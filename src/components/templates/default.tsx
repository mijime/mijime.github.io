import { PropsWithChildren } from 'react'
import Navbar from '@/components/organisms/navbar'

export type DefaultLayoutProps = {
  siteName: string
}

export default function DefaultLayout({
  siteName,
  children
}: PropsWithChildren<DefaultLayoutProps>) {
  return (
    <>
      <Navbar siteName={siteName} />
      <div className="container">
        <div className="column is-8 is-offset-2">{children}</div>
      </div>
    </>
  )
}
