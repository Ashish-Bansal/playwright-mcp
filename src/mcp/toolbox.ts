interface PickingState {
  activePickingType: 'DOM' | 'Image' | null;
  mouseMoveHandler: ((e: MouseEvent) => void) | null;
  clickHandler: ((e: MouseEvent) => void) | null;
}

export const injectToolbox = () => {
  window.addEventListener('DOMContentLoaded', function() {
    const inIframe = window.self !== window.top;
    if (inIframe) {
      return;
    }

    // Create sidebar if it doesn't exist
    if (document.querySelector('#mcp-sidebar')) {
      return;
    }

    const pickingState: PickingState = {
      activePickingType: null,
      mouseMoveHandler: null,
      clickHandler: null
    };

    const toggleSidebar = (expanded: boolean) => {
      const sidebar = document.querySelector('#mcp-sidebar') as HTMLElement;
      const toggleButton = document.querySelector('#mcp-sidebar-toggle-button') as HTMLElement;
      if (sidebar && toggleButton) {
        const width = parseInt(sidebar.style.width);
        sidebar.style.transform = expanded ? 'translateX(0)' : `translateX(${width}px)`;
        toggleButton.style.right = expanded ? `${width}px` : '0';
        toggleButton.textContent = expanded ? '⟩' : '⟨';
        localStorage.setItem('mcp-sidebar-expanded', expanded.toString());
      }
    };

    const mcpStopPicking = () => {
      // Stop picking
      if (pickingState.mouseMoveHandler) {
        document.removeEventListener('mousemove', pickingState.mouseMoveHandler);
      }
      if (pickingState.clickHandler) {
        document.removeEventListener('click', pickingState.clickHandler, true);
      }
      // Remove preview overlay if it exists
      const previewOverlay = document.querySelector('#mcp-highlight-overlay-preview');
      if (previewOverlay) {
        previewOverlay.remove();
      }
      pickingState.activePickingType = null;

      // Restore sidebar state
      toggleSidebar(true);
    };

    const mcpStartPicking = (pickingType: 'DOM' | 'Image') => {
      pickingState.activePickingType = pickingType;

      // Collapse sidebar when picking starts
      toggleSidebar(false);

      pickingState.mouseMoveHandler = (e: MouseEvent) => {
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

      pickingState.clickHandler = async (event: MouseEvent) => {
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
        if (pickingState.activePickingType === 'DOM') {
          const html = element.outerHTML;
          message = {
            type: 'DOM',
            content: html,
            windowUrl: window.location.href
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
            type: 'Image',
            content: screenshot,
            windowUrl: window.location.href
          };
        }

        mcpStopPicking();
        (window as any).onElementPicked(message);
      };

      document.addEventListener('mousemove', pickingState.mouseMoveHandler);
      document.addEventListener('click', pickingState.clickHandler, true);
    };

    // Expose picking functions to window
    window.mcpStartPicking = mcpStartPicking;
    window.mcpStopPicking = mcpStopPicking;

    const getSidebarWidth = () => {
      const defaultWidth = localStorage.getItem('mcp-sidebar-width') || '500';
      return parseInt(defaultWidth);
    }

    const createSidebar = () => {
      const sidebar = document.createElement('div');
      sidebar.id = 'mcp-sidebar';
      const defaultWidth = getSidebarWidth();
      sidebar.style.cssText = `
        position: fixed;
        top: 0;
        right: 0;
        width: ${defaultWidth}px;
        height: 100vh;
        background: #f5f5f5;
        border-left: 1px solid rgb(228, 228, 231);
        z-index: 999999;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        transition: transform 0.3s ease;
      `;

      const iframe = document.createElement('iframe');
      iframe.name = 'toolbox-frame';
      iframe.src = 'http://localhost:5174/';
      iframe.style.cssText = `
        width: 100%;
        height: 100%;
        border: none;
      `;

      // Add resize handle
      const resizeHandle = document.createElement('div');
      resizeHandle.id = 'mcp-resize-handle';
      resizeHandle.style.cssText = `
        position: absolute;
        left: 0;
        top: 0;
        width: 4px;
        height: 100%;
        cursor: ew-resize;
        background: transparent;
      `;

      let isResizing = false;
      let lastX = 0;
      const originalProperties: Record<string, string> = {}

      // Function to start resize
      const startResize = (e: MouseEvent) => {
        isResizing = true;
        lastX = e.clientX;

        // Add an overlay over the iframe while resizing to prevent mouse events going to the iframe
        const overlay = document.createElement('div');
        overlay.className = 'resize-overlay';
        overlay.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;z-index:1000;';
        sidebar.appendChild(overlay);

        // Add resize event listeners to document
        document.addEventListener('mousemove', resize);
        document.addEventListener('mouseup', stopResize);

        // Disable text selection during resize
        originalProperties.bodyUserSelect = document.body.style.userSelect;
        document.body.style.userSelect = 'none';
        const toggleButton = document.querySelector('#mcp-sidebar-toggle-button') as HTMLElement;
        if (toggleButton) {
          originalProperties.toggleButtonTransition = toggleButton.style.transition;
          toggleButton.style.transition = '';
        }
      };

      // Function to handle resize
      const resize = (e: MouseEvent) => {
        if (!isResizing) return;

        const deltaX = lastX - e.clientX;
        const newWidth = Math.min(
          Math.max(400, sidebar.offsetWidth + deltaX),
          window.innerWidth * 0.8
        );

        sidebar.style.width = `${newWidth}px`;
        const toggleButton = document.querySelector('#mcp-sidebar-toggle-button') as HTMLElement;
        if (toggleButton) {
          toggleButton.style.right = `${newWidth}px`;
        }
        localStorage.setItem('mcp-sidebar-width', newWidth.toString());
        lastX = e.clientX;
      };

      // Function to stop resize
      const stopResize = () => {
        if (!isResizing) return;
        isResizing = false;

        // Remove the overlay
        const overlay = sidebar.querySelector('.resize-overlay');
        if (overlay) sidebar.removeChild(overlay);

        // Remove event listeners
        document.removeEventListener('mousemove', resize);
        document.removeEventListener('mouseup', stopResize);

        // Re-enable text selection
        document.body.style.userSelect = originalProperties.bodyUserSelect;
        const toggleButton = document.querySelector('#mcp-sidebar-toggle-button') as HTMLElement;
        if (toggleButton) {
          toggleButton.style.transition = originalProperties.toggleButtonTransition;
        }
      };

      resizeHandle.addEventListener('mousedown', startResize);

      sidebar.appendChild(resizeHandle);
      sidebar.appendChild(iframe);
      document.body.appendChild(sidebar);
    }

    const createSidebarToggleButton = () => {
      const toggleButton = document.createElement('button');
      toggleButton.id = 'mcp-sidebar-toggle-button';
      toggleButton.textContent = '⟩';
      toggleButton.setAttribute('data-skip-recording', 'true');
      const sidebarWidth = getSidebarWidth();
      toggleButton.style.cssText = `
        position: fixed;
        right: ${sidebarWidth}px;
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
      document.body.appendChild(toggleButton);

      let isExpanded = localStorage.getItem('mcp-sidebar-expanded') !== 'false';
      if (!isExpanded) {
        toggleSidebar(false);
      }

      toggleButton.addEventListener('click', () => {
        isExpanded = !isExpanded;
        toggleSidebar(isExpanded);
      });
    }

    createSidebar();
    createSidebarToggleButton();
  });
}
