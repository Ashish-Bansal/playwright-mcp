export const injectToolbox = () => {
  window.onload = () => {
    const inIframe = window.self !== window.top;
    if (inIframe) {
      return;
    }

    // Create toolbar if it doesn't exist
    if (document.querySelector('#mcp-toolbar')) {
      return
    }

    const createToolbar = () => {
      const toolbar = document.createElement('div');
      toolbar.id = 'mcp-toolbar';
      toolbar.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        z-index: 999999;
        background: #f5f5f5;
        border: 1px solid rgb(228, 228, 231);
        border-radius: 4px;
        display: flex;
        flex-direction: column;
      `;

      const dragBar = document.createElement('div');
      dragBar.style.cssText = `
        cursor: move;
        padding: 8px 0;
        background: transparent;
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        color: rgba(244, 244, 245, 0.3);
        box-shadow: rgba(0, 0, 0, 0) 0px 0px 0px 0px;
      `;

      const dragBarIcon = document.createElement('div');
      dragBarIcon.style.cssText = `
        width: 40px;
        height: 4px;
        background: rgba(113, 113, 122, 0.3);
        border-radius: 4px;
      `;
      dragBar.appendChild(dragBarIcon);

      let isDragging = false;
      let translateX = 0;
      let translateY = 0;
      let startX = 0;
      let startY = 0;

      dragBar.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX - translateX;
        startY = e.clientY - translateY;
      });

      document.addEventListener('mousemove', (e) => {
        if (isDragging) {
          translateX = e.clientX - startX;
          translateY = e.clientY - startY;
          toolbar.style.transform = `translate(${translateX}px, ${translateY}px)`;
        }
      });

      document.addEventListener('mouseup', () => {
        isDragging = false;
      });

      const content = document.createElement('div');
      content.style.cssText = `
        display: flex;
        gap: 8px;
        padding: 8px;
        background: #fff;
      `;

      toolbar.appendChild(dragBar);
      toolbar.appendChild(content);
      document.body.appendChild(toolbar);
      return content;
    }

    const getPickButton = () => {
      const pickButton = document.createElement('button');
      pickButton.id = 'mcp-pick-button';
      pickButton.textContent = 'Start Picking';
      pickButton.style.cssText = `
        background: #4CAF50;
        color: white;
        border: none;
        border-radius: 100px;
        cursor: pointer;
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
          pickButton.textContent = 'Start Picking';
          pickButton.style.background = '#4CAF50';
          isPicking = false;
          return;
        }

        // Start picking
        isPicking = true;
        pickButton.textContent = 'Stop Picking';
        pickButton.style.background = '#f44336';

        // Get element under cursor using document.elementFromPoint
        mouseMoveHandler = (e: MouseEvent) => {
          const element = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
          if (!element || element.id === 'mcp-toolbar' || element.id === 'mcp-pick-button' || element.id.startsWith('mcp-highlight-overlay')) return;

          // Create or update highlight overlay
          let overlay: HTMLElement | null = document.querySelector('#mcp-highlight-overlay-preview');
          if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'mcp-highlight-overlay-preview';
            overlay.style.cssText = `
              position: fixed;
              border: 2px solid #4CAF50;
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
          if (!element || element.id === 'mcp-toolbar' || element.id === 'mcp-pick-button' || element.id.startsWith('mcp-highlight-overlay')) return;

          event.stopPropagation();
          event.preventDefault();

          // Set data-pick attribute
          element.setAttribute('data-pick', '');

          const overlay = document.querySelector('#mcp-highlight-overlay-preview');
          if (!overlay) return;

          // Create persistent overlay
          const persistentOverlay = document.createElement('div');
          persistentOverlay.id = `mcp-highlight-overlay-${Date.now()}`;
          persistentOverlay.style.cssText = (overlay as HTMLElement).style.cssText;
          const rect = element.getBoundingClientRect();
          persistentOverlay.style.top = rect.top + 'px';
          persistentOverlay.style.left = rect.left + 'px';
          persistentOverlay.style.width = rect.width + 'px';
          persistentOverlay.style.height = rect.height + 'px';
          document.body.appendChild(persistentOverlay);
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
      `;

      clearButton.addEventListener('click', () => {
        // Remove all overlays
        document.querySelectorAll('[id^="mcp-highlight-overlay"]').forEach(el => {
          el.remove();
        });

        // Remove all data-pick attributes
        document.querySelectorAll('[data-pick]').forEach(el => {
          el.removeAttribute('data-pick');
        });
      });

      return clearButton;
    }

    const toolbar = createToolbar()
    toolbar.appendChild(getPickButton());
    toolbar.appendChild(getClearButton());
  }
}