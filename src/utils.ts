import { JSDOM } from 'jsdom'

export const parseDom = (html: string) => {
  const dom = new JSDOM(html, {
    runScripts: 'outside-only'
  })
  return dom.window
}
