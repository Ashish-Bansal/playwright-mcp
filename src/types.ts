declare global {
  interface Message {
    type: 'DOM' | 'Image';
    content: string;
  }

  interface Window {
    // for the user page
    mcpStartPicking: (pickingType: 'DOM' | 'Image') => void;
    mcpStopPicking: () => void;
    onElementPicked: (message: Message) => void;
    // for the iframe
    triggerMcpStartPicking: (pickingType: 'DOM' | 'Image') => void;
    triggerMcpStopPicking: () => void;
    // for the react page
    globalState: any;
    stateSubscribers: ((state: any) => void)[];
    notifyStateSubscribers: () => void;
    updateGlobalState: (state: any) => void;
    notifyNode: (state: any) => void;
  }
}


