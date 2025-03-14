export const injectToolbox = () => {
  const maximizeIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-maximize"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>`;
  const stopIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-stop"><circle cx="12" cy="12" r="10"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg>`
  const imageIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-image"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`

  interface Message {
    type: 'DOM' | 'Text' | 'Image';
    content: string;
  }

  const createMessageElement = (message: Message) => {
    const messageElement = document.createElement('div');
    messageElement.style.cssText = `
      padding: 8px;
      border-bottom: 1px solid #eee;
      word-break: break-all;
      display: flex;
      flex-direction: column;
      gap: 8px;
    `;

    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;

    const typeLabel = document.createElement('span');
    typeLabel.style.cssText = `
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
    `;

    switch (message.type) {
      case 'DOM':
        typeLabel.textContent = `DOM (${message.content.length} chars)`;
        typeLabel.style.backgroundColor = '#e3f2fd';
        typeLabel.style.color = '#1976d2';
        break;
      case 'Text':
        typeLabel.textContent = 'Text';
        typeLabel.style.backgroundColor = '#e8f5e9';
        typeLabel.style.color = '#388e3c';
        break;
      case 'Image':
        typeLabel.textContent = 'Image';
        typeLabel.style.backgroundColor = '#e8f5e9';
        typeLabel.style.color = '#388e3c';
        break;
    }

    const deleteButton = document.createElement('button');
    deleteButton.innerHTML = '&times;';
    deleteButton.style.cssText = `
      background: none;
      border: none;
      color: #666;
      cursor: pointer;
      padding: 0 4px;
      font-size: 16px;
    `;
    deleteButton.addEventListener('click', () => {
      messageElement.remove();
      (window as any).deleteMessage(message.content);
    });

    header.appendChild(typeLabel);
    header.appendChild(deleteButton);
    messageElement.appendChild(header);

    const content = document.createElement('div');
    switch (message.type) {
      case 'Image':
        const img = document.createElement('img');
        img.src = `data:image/png;base64,${message.content}`;
        img.style.cssText = `
          max-width: 100%;
          border-radius: 4px;
        `;
        content.appendChild(img);
        break;
      case 'DOM':
        const truncatedDOM = message.content.length > 300 ? message.content.slice(0, 297) + '...' : message.content;
        content.textContent = truncatedDOM;
        content.style.fontFamily = 'monospace';
        content.style.fontSize = '12px';
        break;
      case 'Text':
        const truncatedText = message.content.length > 300 ? message.content.slice(0, 297) + '...' : message.content;
        content.textContent = truncatedText;
        break;
    }

    messageElement.appendChild(content);
    return messageElement;
  }

  const scrollToEnd = (container: HTMLElement) => {
    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth'
    });
  };

  let activePickingType: 'DOM' | 'Text' | 'Image' | null = null;
  let mouseMoveHandler: ((e: MouseEvent) => void) | null = null;
  let clickHandler: ((e: MouseEvent) => void) | null = null;

  const updateDOMButton = (enabled: boolean) => {
    const pickButton = document.querySelector('#mcp-pick-button');
    if (pickButton) {
      pickButton.innerHTML = `${enabled ? stopIcon : maximizeIcon} <span style="margin-left: 8px;">${enabled ? 'Stop Picking' : 'Pick DOM'}</span>`;
    }
  }

  const updateImageButton = (enabled: boolean) => {
    const imageButton = document.querySelector('#mcp-image-button');
    if (imageButton) {
      imageButton.innerHTML = `${enabled ? stopIcon : imageIcon} <span style="margin-left: 8px;">${enabled ? 'Stop Picking' : 'Pick Image'}</span>`;
    }
  }

  const toggleSidebar = (isExpanded: boolean) => {
    const sidebar = document.querySelector('#mcp-sidebar') as HTMLElement;
    const toggleButton = document.querySelector('#mcp-sidebar-toggle-button') as HTMLElement;
    sidebar.style.transform = isExpanded ? 'translateX(0)' : 'translateX(300px)';
    toggleButton.style.right = isExpanded ? '300px' : '0';
    toggleButton.textContent = isExpanded ? '⟩' : '⟨';
    localStorage.setItem('mcp-sidebar-expanded', isExpanded.toString());
  };

  const stopPicking = () => {
    toggleSidebar(true);

      // Stop picking
      if (mouseMoveHandler) {
        document.removeEventListener('mousemove', mouseMoveHandler);
      }
      if (clickHandler) {
        document.removeEventListener('click', clickHandler, true);
      }
      // Remove preview overlay if it exists
      const previewOverlay = document.querySelector('#mcp-highlight-overlay-preview');
      if (previewOverlay) {
        previewOverlay.remove();
      }
      updateDOMButton(false);
      updateImageButton(false);
      activePickingType = null;
  }

  const startPicking = (pickingType: 'DOM' | 'Image' | null) => {
    toggleSidebar(false);

    activePickingType = pickingType;
    if (pickingType === 'DOM') {
      updateDOMButton(true);
    } else if (pickingType === 'Image') {
      updateImageButton(true);
    }

    mouseMoveHandler = (e: MouseEvent) => {
      const element = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
      const sidebar = document.querySelector('#mcp-sidebar');
      const expandButton = document.querySelector('#mcp-sidebar-toggle-button');
      if (!element ||
        (sidebar && sidebar.contains(element)) ||
        (expandButton && expandButton.contains(element)) ||
        element.closest('[id^="mcp-highlight-overlay"]')) return;

      // Create or update highlight overlay
      let overlay: HTMLElement | null = document.querySelector('#mcp-highlight-overlay-preview');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'mcp-highlight-overlay-preview';
        overlay.style.cssText = `
          position: fixed;
          border: 1px dashed #4CAF50;
          background: rgba(76, 175, 80, 0.1);
          pointer-events: none;
          z-index: 999998;
          transition: all 0.2s ease;
        `;
        document.body.appendChild(overlay);
      }

      const rect = element.getBoundingClientRect();
      overlay.style.top = rect.top + 'px';
      overlay.style.left = rect.left + 'px';
      overlay.style.width = rect.width + 'px';
      overlay.style.height = rect.height + 'px';
    };

    clickHandler = async (event: MouseEvent) => {
      const element = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement;
      const sidebar = document.querySelector('#mcp-sidebar');
      const expandButton = document.querySelector('#mcp-sidebar-toggle-button');
      if (!element ||
        (sidebar && sidebar.contains(element)) ||
        (expandButton && expandButton.contains(element)) ||
        element.closest('[id^="mcp-highlight-overlay"]')) return;

      event.stopPropagation();
      event.preventDefault();

      let message: Message;
      if (activePickingType === 'DOM') {
        const html = element.outerHTML;
        (window as any).onElementPicked(html);
        message = {
          type: 'DOM' as const,
          content: html
        };
      } else {
        const previewOverlay = document.querySelector('#mcp-highlight-overlay-preview') as HTMLElement;
        if (previewOverlay) {
          previewOverlay.style.display = 'none';
        }
        const screenshotId = `screenshot-${Math.random().toString(36).substring(2)}`;
        element.setAttribute('data-screenshot-id', screenshotId);
        const screenshot = await (window as any).takeScreenshot(`[data-screenshot-id="${screenshotId}"]`);
        element.removeAttribute('data-screenshot-id');
        if (previewOverlay) {
          previewOverlay.style.display = 'block';
        }
        message = {
          type: 'Image' as const,
          content: screenshot
        };
      }

      // Add message to container
      const messagesContainer = document.querySelector('#mcp-messages') as HTMLElement;
      if (messagesContainer) {
        messagesContainer.appendChild(createMessageElement(message))
        scrollToEnd(messagesContainer);
      }
      stopPicking();
    };

    document.addEventListener('mousemove', mouseMoveHandler);
    document.addEventListener('click', clickHandler, true);
  }

  const getPickButton = () => {
    const pickButton = document.createElement('button');
    pickButton.id = 'mcp-pick-button';
    pickButton.innerHTML = `${maximizeIcon} <span style="margin-left: 8px;">Pick DOM</span>`;
    pickButton.style.cssText = `
      color: rgb(9, 9, 11);
      border: 1px solid rgb(228, 228, 231);
      border-radius: 6px;
      box-shadow: rgba(0, 0, 0, 0) 0px 0px 0px 0px;
      cursor: pointer;
      height: 36px;
      padding: 0 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    pickButton.addEventListener('click', () => {
      if (activePickingType !== 'DOM') {
        stopPicking();
        startPicking("DOM");
      } else {
        stopPicking();
      }
    });

    return pickButton;
  }

  const getImageButton = () => {
    const imageButton = document.createElement('button');
    imageButton.id = 'mcp-image-button';
    imageButton.innerHTML = `${imageIcon} <span style="margin-left: 8px;">Pick Image</span>`;
    imageButton.style.cssText = `
      color: rgb(9, 9, 11);
      border: 1px solid rgb(228, 228, 231);
      border-radius: 6px;
      box-shadow: rgba(0, 0, 0, 0) 0px 0px 0px 0px;
      cursor: pointer;
      height: 36px;
      padding: 0 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    imageButton.addEventListener('click', () => {
      if (activePickingType !== 'Image') {
        stopPicking();
        startPicking("Image");
      } else {
        stopPicking();
      }
    });

    return imageButton;
  }

  window.onload = () => {
    const inIframe = window.self !== window.top;
    if (inIframe) {
      return;
    }

    // Create sidebar if it doesn't exist
    if (document.querySelector('#mcp-sidebar')) {
      return
    }

    const createSidebar = () => {
      const sidebar = document.createElement('div');
      sidebar.id = 'mcp-sidebar';
      sidebar.style.cssText = `
        position: fixed;
        top: 0;
        right: 0;
        width: 300px;
        height: 100vh;
        background: #f5f5f5;
        border-left: 1px solid rgb(228, 228, 231);
        z-index: 999999;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        transition: transform 0.3s ease;
      `;

      // Header section
      const header = document.createElement('div');
      header.style.cssText = `
        padding: 16px;
        background: #fff;
        border-bottom: 1px solid rgb(228, 228, 231);
        display: flex;
        align-items: center;
        justify-content: center;
      `;

      const title = document.createElement('h3');
      title.textContent = 'Playwright MCP';
      title.style.cssText = `
        margin: 0;
        font-size: 16px;
        font-weight: 500;
        color: rgb(17, 24, 39);
      `;

      header.appendChild(title);
      sidebar.appendChild(header);

      // Tools section
      const tools = document.createElement('div');
      tools.style.cssText = `
        padding: 16px;
        background: #fff;
        border-bottom: 1px solid rgb(228, 228, 231);
        display: flex;
        gap: 8px;
      `;
      tools.appendChild(getPickButton());
      tools.appendChild(getImageButton());
      sidebar.appendChild(tools);

      // Messages section
      const messagesContainer = document.createElement('div');
      messagesContainer.id = 'mcp-messages';
      messagesContainer.style.cssText = `
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 16px;
        overflow-y: auto;
      `;

      sidebar.appendChild(messagesContainer);

      // Input section
      const inputContainer = document.createElement('div');
      inputContainer.style.cssText = `
        padding: 16px;
        background: #fff;
        border-top: 1px solid rgb(228, 228, 231);
      `;

      const textarea = document.createElement('textarea');
      textarea.style.cssText = `
        width: 100%;
        padding: 8px;
        border: 1px solid rgb(228, 228, 231);
        border-radius: 4px;
        resize: none;
        height: 60px;
        font-family: inherit;
      `;

      textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          const text = textarea.value.trim();
          if (text) {
            const message = {
              type: 'Text' as const,
              content: text
            };
            messagesContainer.appendChild(createMessageElement(message));
            scrollToEnd(messagesContainer);
            (window as any).onElementPicked(message.content);
            textarea.value = '';
          }
        }
      });

      inputContainer.appendChild(textarea);
      sidebar.appendChild(inputContainer);

      document.body.appendChild(sidebar);
      return { messagesContainer };
    }

    const createSidebarToggleButton = () => {
      // Toggle button on the left side
      const toggleButton = document.createElement('button');
      toggleButton.id = 'mcp-sidebar-toggle-button';
      toggleButton.textContent = '⟩';
      toggleButton.style.cssText = `
        position: fixed;
        right: 300px;
        top: 50%;
        transform: translateY(-50%);
        background: #f5f5f5;
        border: 1px solid rgb(228, 228, 231);
        border-right: none;
        border-radius: 4px 0 0 4px;
        font-size: 20px;
        cursor: pointer;
        padding: 8px;
        color: rgb(17, 24, 39);
        z-index: 999999;
        transition: right 0.3s ease;
      `;

      // Initialize isExpanded from localStorage or default to true
      let isExpanded = localStorage.getItem('mcp-sidebar-expanded') !== 'false';

      // Set initial state
      if (!isExpanded) {
        toggleSidebar(false);
      }

      toggleButton.addEventListener('click', () => {
        isExpanded = !isExpanded;
        toggleSidebar(isExpanded);
      });
      document.body.appendChild(toggleButton);
      return toggleButton;
    }

    const { messagesContainer } = createSidebar();
    const toggleButton = createSidebarToggleButton();

    (window as any).getMessages().then((messages: Message[]) => {
      messages.forEach(message => {
        messagesContainer.appendChild(createMessageElement(message));
      });
      scrollToEnd(messagesContainer);
    });
  }
}
