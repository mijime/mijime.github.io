import { PropsWithChildren } from 'react'

type Color = 'gray' | 'green' | 'blue' | 'red'

export type TagProps = {
  color: Color
}

export default function Tag({ color, children }: PropsWithChildren<TagProps>) {
  return (
    <span
      className={`bg-${color}-200 border-${color}-100 text-${color}-600 px-2 py-1 border-2 text-xs rounded-md`}
    >
      {children}
    </span>
  )
}
