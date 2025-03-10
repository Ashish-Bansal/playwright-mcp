export const injectToolbox = () => {
  window.onload = () => {
    // Create pick button if it doesn't exist
    if (!document.querySelector('#mcp-pick-button')) {
      const pickButton = document.createElement('button');
      pickButton.id = 'mcp-pick-button';
      pickButton.textContent = 'Pick Element';
      pickButton.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        z-index: 999999;
        padding: 8px 16px;
        background: #4CAF50;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      `;
      document.body.appendChild(pickButton);

      pickButton.addEventListener('click', () => {
        // Remove existing data-pick attributes
        document.querySelectorAll('[data-pick]').forEach(el => {
          el.removeAttribute('data-pick');
        });

        // Remove existing highlight overlay
        const existingOverlay = document.querySelector('#mcp-highlight-overlay');
        if (existingOverlay) {
          existingOverlay.remove();
        }

        // Get element under cursor using document.elementFromPoint
        const handleMouseMove = (e: MouseEvent) => {
          const element = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
          if (!element || element.id === 'mcp-pick-button' || element.id === 'mcp-highlight-overlay') return;

          // Create or update highlight overlay
          let overlay: HTMLElement | null = document.querySelector('#mcp-highlight-overlay');
          if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'mcp-highlight-overlay';
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

          // Add click handler to the current element
          const handleClick = (event: MouseEvent) => {
            event.stopPropagation();
            event.preventDefault();

            // Remove old handlers
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('click', handleClick, true);

            // Set data-pick attribute
            element.setAttribute('data-pick', '');

            // Clean up overlay
            overlay.remove();
          };

          // Ensure this is the first event listener
          element.addEventListener('click', handleClick, true);
        };

        document.addEventListener('mousemove', handleMouseMove);
      });
    }
  }
}