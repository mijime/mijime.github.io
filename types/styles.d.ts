type classes = { [key: string]: string }

declare module '*.module.css' {
  export default classes
}

declare module '*.module.less' {
  export default classes
}

declare module '*.module.scss' {
  export default classes
}
