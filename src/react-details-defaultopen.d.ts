import 'react'

/** `<details defaultOpen>` is valid HTML; @types/react omits it on DetailsHTMLAttributes. */
declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- generic matches React’s declaration for merge
  interface DetailsHTMLAttributes<T extends HTMLDetailsElement = HTMLDetailsElement> {
    defaultOpen?: boolean
  }
}
