declare module "html-to-image" {
  export function toPng(node: HTMLElement, options?: Record<string, unknown>): Promise<string>
}

declare module "jspdf" {
  export class jsPDF {
    constructor(options?: Record<string, unknown>)
    internal: unknown
    addImage(...args: unknown[]): void
    save(filename: string): void
  }
}
