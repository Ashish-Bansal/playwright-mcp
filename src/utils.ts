import { Window } from 'happy-dom'

export const parseDom = (html: string) => {
  const window = new Window({
    settings: {
      disableJavaScriptEvaluation: true,
    },
  })
  window.document.documentElement.innerHTML = html
  return window
}
