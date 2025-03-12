export const injectToolbox = () => {
  const maximizeIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-maximize"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>`;
  const stopIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-stop"><circle cx="12" cy="12" r="10"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg>`

  window.onload = () => {
    const inIframe = window.self !== window.top;
    if (inIframe) {
      return;
    }

    // Create sidebar if it doesn't exist
    if (document.querySelector('#mcp-sidebar')) {
      return
    }

    const scrollToEnd = (container: HTMLElement) => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
    };

    const createMessage = (message: string) => {
      const messageElement = document.createElement('div');
      messageElement.style.cssText = `
        padding: 4px;
        border-bottom: 1px solid #eee;
        word-break: break-all;
        display: flex;
        justify-content: space-between;
        align-items: center;
      `;

      const messageText = document.createElement('div');
      const truncatedMessage = message.length > 300 ? message.slice(0, 297) + '...' : message;
      messageText.textContent = truncatedMessage;

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
        (window as any).deleteMessage(message);
      });

      messageElement.appendChild(messageText);
      messageElement.appendChild(deleteButton);
      return messageElement;
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

      let isPicking = false;
      let mouseMoveHandler: ((e: MouseEvent) => void) | null = null;
      let clickHandler: ((e: MouseEvent) => void) | null = null;

      pickButton.addEventListener('click', () => {
        if (isPicking) {
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
          isPicking = false;
          pickButton.innerHTML = `${maximizeIcon} <span style="margin-left: 8px;">Pick DOM</span>`;
          return;
        }

        // Start picking
        isPicking = true;
        pickButton.innerHTML = `${stopIcon} <span style="margin-left: 8px;">Stop Picking</span>`;

        // Get element under cursor using document.elementFromPoint
        mouseMoveHandler = (e: MouseEvent) => {
          const element = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
          if (!element || element.id === 'mcp-sidebar' || element.id === 'mcp-pick-button' || element.id.startsWith('mcp-highlight-overlay')) return;

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

        clickHandler = (event: MouseEvent) => {
          const element = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement;
          if (!element || element.id === 'mcp-sidebar' || element.id === 'mcp-pick-button' || element.id.startsWith('mcp-highlight-overlay')) return;

          event.stopPropagation();
          event.preventDefault();

          const message = element.outerHTML;

          // Add message to container
          const messagesContainer = document.querySelector('#mcp-messages') as HTMLElement;
          if (messagesContainer) {
            messagesContainer.appendChild(createMessage(message))
            scrollToEnd(messagesContainer);
          }

          // Call the exposed function to store the element
          (window as any).onElementPicked(message);
        };

        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('click', clickHandler, true);
      });

      return pickButton;
    }

    const getClearButton = () => {
      const clearButton = document.createElement('button');
      clearButton.id = 'mcp-clear-button';
      clearButton.textContent = 'Clear All';
      clearButton.style.cssText = `
        background: #f44336;
        color: white;
        border: none;
        border-radius: 100px;
        cursor: pointer;
        padding: 8px 16px;
      `;

      clearButton.addEventListener('click', () => {
        // Clear messages container
        const messagesContainer = document.querySelector('#mcp-messages');
        if (messagesContainer) {
          messagesContainer.innerHTML = '';
        }

        // Call the exposed function to clear picked elements
        (window as any).clearPickedElements();
      });

      return clearButton;
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

      // Toggle button on the left side
      const toggleButton = document.createElement('button');
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

      let isExpanded = true;
      toggleButton.addEventListener('click', () => {
        console.log('button toggled');
        isExpanded = !isExpanded;
        sidebar.style.transform = isExpanded ? 'translateX(0)' : 'translateX(300px)';
        toggleButton.style.right = isExpanded ? '300px' : '0';
        toggleButton.textContent = isExpanded ? '⟩' : '⟨';
      });

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
      tools.appendChild(getClearButton());
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
          const message = textarea.value.trim();
          if (message) {
            messagesContainer.appendChild(createMessage(message));
            scrollToEnd(messagesContainer);
            (window as any).onElementPicked(message);
            textarea.value = '';
          }
        }
      });

      inputContainer.appendChild(textarea);
      sidebar.appendChild(inputContainer);

      document.body.appendChild(sidebar);
      document.body.appendChild(toggleButton);
      return { messagesContainer };
    }

    const { messagesContainer } = createSidebar();

    (window as any).getMessages().then((messages: string[]) => {
      messages.forEach(message => {
        messagesContainer.appendChild(createMessage(message));
      });
      scrollToEnd(messagesContainer);
    });
  }
}
