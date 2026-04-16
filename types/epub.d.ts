declare module 'epubjs' {
  export interface Book {
    ready: Promise<void>
    locations: {
      generate(chars: number): Promise<void>
      cfiFromPercentage(percentage: number): string | null
    }
    navigation: Promise<{
      toc: NavItem[]
    }>
    renderTo(element: string | HTMLElement, options: Record<string, any>): Rendition
    destroy(): void
    package?: {
      metadata?: {
        title?: string
        creator?: string | string[]
        author?: string
        language?: string
        [key: string]: any
      }
    }
    coverUrl(): Promise<string | null>
  }

  export interface Rendition {
    display(target?: string | number): Promise<void>
    next(): Promise<void>
    prev(): Promise<void>
    destroy(): void
    resize(): void
    on(event: string, callback: (data: any) => void): void
    off(event: string, callback: (data: any) => void): void
    themes: {
      register(name: string, styles: Record<string, Record<string, string>>): void
      select(name: string): void
    }
  }

  export interface NavItem {
    label: string
    href: string
    level?: number
    subitems?: NavItem[]
  }

  export default function Epub(data: ArrayBuffer | string): Book
}
