import Link from 'next/link'
import { PropsWithChildren } from 'react'
import NavbarHeader from '@/components/organisms/navbar-header/'

export type DefaultLayoutProps = {
  siteName: string
}

export default function DefaultLayout({
  siteName,
  children
}: PropsWithChildren<DefaultLayoutProps>) {
  return (
    <div className="font-mono">
      <NavbarHeader>
        <Link href="/">{siteName}</Link>
      </NavbarHeader>
      <div className="md:container mx-auto px-4 py-4">{children}</div>
    </div>
  )
}
