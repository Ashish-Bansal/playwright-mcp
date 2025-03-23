import { logger } from '../logger'

const ATTR_PRIORITIES: Record<string, number> = {
  id: 1,
  'data-testid': 2,
  'data-test-id': 2,
  'data-pw': 2,
  'data-cy': 2,
  'data-id': 2,
  'data-name': 3,
  name: 3,
  'aria-label': 3,
  title: 3,
  placeholder: 4,
  href: 4,
  alt: 4,
  'data-index': 5,
  'data-role': 5,
  role: 5,
}

const IMPORTANT_ATTRS = Object.keys(ATTR_PRIORITIES)

const _escapeSpecialCharacters = (str: string): string => {
  // Only escape double quotes for CSS selectors
  return str.replace(/"/g, '\\"')
}

const getNodeSimpleSelectors = (element: Element): string[] => {
  const selectors: string[] = []
  const tag = element.tagName.toLowerCase()

  const attrSelectors = IMPORTANT_ATTRS.map((attr) => {
    const value = element.getAttribute(attr)
    if (!value) return null
    return {
      priority: ATTR_PRIORITIES[attr] || 999,
      selector:
        attr === 'id'
          ? `#${_escapeSpecialCharacters(value)}`
          : `${tag}[${attr}="${_escapeSpecialCharacters(value)}"]`,
    }
  }).filter((item) => item !== null)

  const otherSelectors = []

  // Locate by class
  const classList = element.classList
  if (classList.length > 0) {
    otherSelectors.push({
      priority: 100,
      selector: `${tag}.${Array.from(classList).join('.')}`,
    })
  }

  const availableSelectors = [...attrSelectors, ...otherSelectors]
  availableSelectors.sort((a, b) => a!.priority - b!.priority)

  // Take top 5 selectors based on priority
  const topSelectors = availableSelectors.slice(0, 5)
  topSelectors.push({
    priority: 999,
    selector: tag,
  })

  // Add selectors in priority order
  for (const item of topSelectors) {
    selectors.push(item!.selector)
  }

  return selectors
}

const _getSiblingRelationshipSelectors = (dom: Document, element: Element): string[] => {
  const selectors: string[] = []
  const parent = element.parentElement
  if (!parent || parent.tagName === 'BODY') {
    return selectors
  }

  const siblings = Array.from(parent.children)
  const elementIndex = siblings.indexOf(element)
  const tagName = element.tagName.toLowerCase()

  const selectorPrefixes: string[] = []
  for (let i = 0; i < siblings.length; i++) {
    if (i === elementIndex) continue

    const sibling = siblings[i]
    const siblingSimpleSelectors = getNodeSimpleSelectors(sibling)
    siblingSimpleSelectors.forEach((siblingSelector) => {
      selectorPrefixes.push(`${siblingSelector} ~ `)
    })
  }

  const selectorSuffixes = [tagName, ...getNodeSimpleSelectors(element)]
  selectorSuffixes.forEach((selectorSuffix) => {
    selectorPrefixes.forEach((selectorPrefix) => {
      selectors.push(`${selectorPrefix}${selectorSuffix}`)
    })
  })

  return selectors
}

const _getChildRelationshipSelectors = (dom: Document, element: Element) => {
  // BFS to get all children and their depth upto level 3
  const children = []
  const currentQueue = Array.from(element.children).map((child) => ({
    child,
    depth: 0,
  }))
  while (currentQueue.length > 0) {
    const item = currentQueue.shift()
    if (!item) continue

    const { child, depth } = item
    if (depth > 3) {
      continue
    }

    children.push({ child, depth })
    currentQueue.push(
      ...Array.from(child.children).map((child) => ({
        child,
        depth: depth + 1,
      })),
    )
  }

  const selectorSuffixes: string[] = []
  children.forEach(({ child, depth }) => {
    const childSelectors = getNodeSimpleSelectors(child)
    const childIndex = Array.from(element.children).indexOf(child) + 1

    childSelectors.forEach((childSelector) => {
      if (depth === 0) {
        // For now, disable `>` immediate child selector, since that doesn't work properly.
        // In happy-dom, it's not supported - https://github.com/capricorn86/happy-dom/issues/1642
        // In jsdom, it's giving DOM exception
        // Example - Failed to validate selector
        //     div:has(> [data-testid="adult_count"])
        //     DOMException {}
        //     message = 'div.`makeFlex >[data-testid="adult_count"]' is not a valid selector
        //     code = 12
        // Selector for parent element, using :has() to indicate parent contains this specific child
        selectorSuffixes.push(`:has(${childSelector})`)
        // Also add nth-child variant for more specificity if needed
        selectorSuffixes.push(`:has(${childSelector}:nth-child(${childIndex}))`)
      } else {
        // Depth != 0, means it's a descendant, not direct child.
        selectorSuffixes.push(`:has(${childSelector})`)
      }
    })
  })

  const selectorPrefixes = [
    element.tagName.toLowerCase(),
    ...getNodeSimpleSelectors(element),
  ]

  const selectors: string[] = []
  selectorPrefixes.forEach((selectorPrefix) => {
    selectorSuffixes.forEach((selectorSuffix) => {
      selectors.push(`${selectorPrefix}${selectorSuffix}`)
    })
  })
  return selectors
}

const getMatchCount = (dom: Document, selector: string): number => {
  try {
    return dom.querySelectorAll(selector).length
  } catch {
    return Number.POSITIVE_INFINITY // Invalid selector
  }
}

const _getParentPathSelectors = (dom: Document, element: Element): string[] => {
  // Build path from target to root
  const path: Element[] = []
  let current: Element | null = element
  while (current && current.tagName !== 'HTML') {
    path.push(current)
    current = current.parentElement
  }

  logger.debug(
    'Path',
    path.map((node) => node.tagName),
  )

  // Pre-compute selectors for each node
  const nodeSelectors: {
    node: Element
    selectors: string[]
  }[] = path.map((node) => ({
    node,
    selectors: getNodeSimpleSelectors(node),
  }))
  if (!nodeSelectors.length) {
    return []
  }

  const result: string[] = []
  const targetNode = nodeSelectors[0].node
  const targetSelectors = nodeSelectors[0].selectors
  const targetSelectorsWithNthChild = targetSelectors.map((selector) => {
    const index =
      targetNode.parentElement
        ? Array.from(targetNode.parentElement.children).indexOf(targetNode) + 1
        : 1
    return `${selector}:nth-child(${index})`
  })
  const allTargetSelectors = [
    ...targetSelectors,
    ...targetSelectorsWithNthChild,
  ]
  logger.debug('Target Selectors', allTargetSelectors)

  for (const targetSelector of allTargetSelectors) {
    const matches = getMatchCount(dom, targetSelector)

    // Skip invalid selectors
    if (matches === 0) continue

    // If unique, add to results
    if (matches === 1) {
      result.push(targetSelector)
    }

    // Try combinations with ancestors
    let currentSelector = targetSelector
    let currentMatches = matches
    let lastAddedNode = targetNode

    for (let i = 1; i < nodeSelectors.length; i++) {
      const ancestor = nodeSelectors[i].node
      const ancestorSelectors = nodeSelectors[i].selectors
      let bestSelector: string | null = null
      let bestMatches = currentMatches

      for (const ancestorSelector of ancestorSelectors) {
        const descendantOperator =
          Array.from(ancestor.children).indexOf(lastAddedNode) !== -1
            ? ' > '
            : ' '
        const possibleCombinedSelectors = [
          `${ancestorSelector} ${descendantOperator} ${currentSelector}`,
        ]
        if (ancestor.tagName != 'BODY' && ancestor.parentElement) {
          const elementIndex =
            Array.from(ancestor.parentElement.children).indexOf(ancestor) + 1
          possibleCombinedSelectors.push(
            `${ancestorSelector}:nth-child(${elementIndex}) ${descendantOperator} ${currentSelector}`,
          )
        }

        logger.debug('Possible Combined Selectors', possibleCombinedSelectors)

        for (const combinedSelector of possibleCombinedSelectors) {
          const newMatches = getMatchCount(dom, combinedSelector)

          // Skip invalid combinations
          if (newMatches === 0) continue
          else if (newMatches === 1) {
            // If unique, add to results immediately
            result.push(combinedSelector)
            bestSelector = null // Skip updating current selector
          } else if (newMatches < bestMatches) {
            // Update best if it reduces matches
            bestSelector = combinedSelector
            bestMatches = newMatches
          }
        }
      }

      // Update current if we found a better (but not unique) selector
      if (bestSelector && bestMatches < currentMatches) {
        currentSelector = bestSelector
        currentMatches = bestMatches
        lastAddedNode = ancestor
      }
    }
  }

  return result
}


const validateSelector = (document: Document, element: Element, selector: string) => {
  try {
    const selectedElements = document.querySelectorAll(selector)
    return selectedElements.length === 1 && selectedElements[0] === element
  } catch (e) {
    return false
  }
}

const getSelectors = (document: Document, elementUUID: string): string[] => {
  const element = document.querySelector(`[uuid="${elementUUID}"]`)
  if (!element) {
    throw new Error(`Element with UUID ${elementUUID} not found`)
  }

  const validSelectors: string[] = []
  const selectorGenerators = [
    () => _getParentPathSelectors(document, element),
    () => _getChildRelationshipSelectors(document, element),
    () => _getSiblingRelationshipSelectors(document, element)
  ]

  for (const generator of selectorGenerators) {
    const selectors = generator()
    for (const selector of selectors) {
      if (validateSelector(document, element, selector)) {
        validSelectors.push(selector)
        if (validSelectors.length >= 10) {
          return validSelectors
        }
      }
    }
  }

  return validSelectors
}

export { getSelectors }
