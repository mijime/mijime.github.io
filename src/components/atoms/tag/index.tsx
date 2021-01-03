import { PropsWithChildren } from 'react'

export type TagProps = {
  className?: string
}

export default function Tag({
  className,
  children
}: PropsWithChildren<TagProps>) {
  return (
    <span className={`px-2 py-1 border-2 text-xs rounded-md ${className}`}>
      {children}
    </span>
  )
}
