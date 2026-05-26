declare module 'epubjs' {
  import { EventEmitter } from 'events'

  export interface Book {
    ready: Promise<void>
    opened: Promise<void>
    rendered: Promise<void>
    package: {
      metadata: {
        title?: string
        creator?: string | string[]
        [key: string]: any
      }
    }
    navigation: Promise<{ toc: NavItem[] }>
    locations: {
      generate(chars: number): Promise<void>
      cfiFromPercentage(percentage: number): string | undefined
      percentageFromCfi(cfi: string): number | undefined
    }
    coverUrl(): Promise<string | undefined>
    renderTo(element: string | HTMLElement, options?: RenditionOptions): Rendition
    destroy(): void
    on(event: string, callback: (...args: any[]) => void): void
  }

  export interface RenditionOptions {
    width?: string | number
    height?: string | number
    spread?: string
    flow?: string
    manager?: string
    stylesheet?: string
    script?: string
    allowScriptedContent?: boolean
  }

  export interface Rendition {
    display(target?: string | number | undefined): Promise<void>
    next(): Promise<void>
    prev(): Promise<void>
    resize(): void
    destroy(): void
    location?: {
      start?: {
        cfi?: string
        href?: string
        displayed?: { page?: number; total?: number }
        percentage?: number
      }
      end?: any
      atStart?: boolean
      atEnd?: boolean
    }
    currentLocation(): {
      start?: { cfi?: string; href?: string; displayed?: { page?: number; total?: number }; percentage?: number }
      atStart?: boolean
      atEnd?: boolean
    }
    themes: {
      register(name: string, styles: Record<string, Record<string, string>>): void
      select(name: string): void
    }
    on(event: string, callback: (...args: any[]) => void): void
  }

  export interface NavItem {
    id?: string
    href?: string
    label?: string
    subitems?: NavItem[]
    parent?: string
    level?: number
  }

  export default function Epub(data: ArrayBuffer | string | object, options?: any): Book
}
