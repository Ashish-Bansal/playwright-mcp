import { BrowserEvent, BrowserEventType } from "./events.js";
import { getSelectors } from "./selector-engine.js";
import { JSDOM } from "jsdom";

const parseDom = (html: string) => {
  const dom = new JSDOM(html, {
    runScripts: 'outside-only'
  })
  return dom.window.document
}

const extractText = (element: Element): string => {
  if (element.childNodes.length === 0) {
    return element.textContent?.trim() || ''
  }

  const texts = Array.from(element.childNodes).map((node) =>
    extractText(node as unknown as Element),
  )
  return texts
    .filter((text) => text.trim().length > 0)
    .map((text) => text.trim())
    .join('\n')
}

const extractTextsFromSiblings = (element: Element): string[] => {
  const siblings = Array.from(element.parentElement?.childNodes || [])
  return siblings
    .map((sibling) => extractText(sibling as unknown as Element))
    .map((text) => text.trim())
    .filter((text) => text.length > 0)
}


export const preprocessBrowserEvent = (event: BrowserEvent) => {
  if (
    event.type === BrowserEventType.Click ||
    event.type === BrowserEventType.Input
  ) {
    event.selectors = getSelectors(parseDom(event.dom), event.elementUUID)

    const dom = parseDom(event.dom)
    const element = dom.querySelector(`[uuid="${event.elementUUID}"]`)
    event.elementName = element ? getElementName(element) : "unknown"
    event.elementType = element ? getElementType(element) : "unknown"
  }
}

const getElementName = (element: Element) => {
  let text = ''
  const priorityAttrs = ['aria-label', 'title', 'placeholder', 'name']
  for (const attr of priorityAttrs) {
    if (!text) {
      text = element?.getAttribute(attr) || ''
    }
  }
  if (!text) {
    text = extractText(element)
  }
  if (!text) {
    text = extractTextsFromSiblings(element).join('\n')
  }
  if (!text) {
    text = "unknown"
  }
  return text
}

const getElementType = (element: Element) => {
  const tagName = element?.tagName.toLowerCase()
  let elementType: 'button' | 'link' | 'input' | 'textarea' | 'element' =
    'element'
  if (tagName === 'a') {
    elementType = 'link'
  } else if (tagName === 'button') {
    elementType = 'button'
  } else if (tagName === 'textarea') {
    elementType = 'textarea'
  } else if (tagName === 'input') {
    elementType = 'input'
  }
  return elementType
}
