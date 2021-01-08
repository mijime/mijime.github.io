import classnames from 'classnames'
import Link from 'next/link'
import { PropsWithChildren } from 'react'

import styles from './index.module.css'

import NavbarHeader from '@/components/organisms/navbar-header/'

export type DefaultLayoutProps = {
  siteName: string
}

export default function DefaultLayout({
  siteName,
  children
}: PropsWithChildren<DefaultLayoutProps>) {
  return (
    <div className={classnames(styles.defaultLayout)}>
      <NavbarHeader>
        <Link href="/">{siteName}</Link>
      </NavbarHeader>
      <div className={classnames(styles.defaultLayoutContent)}>{children}</div>
    </div>
  )
}
