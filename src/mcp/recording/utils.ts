import { BrowserEvent, BrowserEventType } from "./events.js";
import { getSelectors } from "./selector-engine.js";
import { JSDOM } from "jsdom";

const parseDom = (html: string) => {
  const dom = new JSDOM(html, {
    runScripts: 'outside-only'
  })
  return dom.window.document
}

export const preprocessBrowserEvent = (event: BrowserEvent) => {
  if (
    event.type === BrowserEventType.Click ||
    event.type === BrowserEventType.Input
  ) {
    event.selectors = getSelectors(parseDom(event.dom), event.elementUUID)
  }
}
