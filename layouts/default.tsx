import { PropsWithChildren } from 'react'
import Navbar from '@/components/navbar'

export default function DefaultLayout({ children }: PropsWithChildren<any>) {
  return (
    <>
      <Navbar />
      <div className="container">
        <div className="column is-8 is-offset-2">{children}</div>
      </div>
    </>
  )
}
