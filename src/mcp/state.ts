import type { Page } from "playwright";
type MessageType = 'DOM' | 'Text' | 'Image' | 'Interaction';
type PickingType = 'DOM' | 'Image';

interface Message {
  type: MessageType;
  content: string;
}

let globalState = {
  messages: [] as Message[],
  pickingType: null as PickingType | null,
  recordingInteractions: false as boolean,
}

async function initState(page: Page) {
  page.exposeFunction('notifyNode', (state: any) => {
    globalState = structuredClone(state);
  });

  page.addInitScript((state) => {
    if (window.globalState) {
      return
    }

    window.globalState = state;
    window.stateSubscribers = [];

    // function to notify other components
    window.notifyStateSubscribers = () => {
      window.stateSubscribers.forEach(cb => cb(window.globalState));
    };

    // function to notify Node.js from React
    window.updateGlobalState = (state: any) => {
      window.globalState = { ...state };
      window.notifyStateSubscribers();
      window.notifyNode(state);
    };
  }, globalState);
}

async function syncToReact(page: Page, state: typeof globalState) {
  const allFrames = await page.frames();
  const toolboxFrame = allFrames.find(f => f.name() === 'toolbox-frame');
  if (!toolboxFrame) {
    console.error('Toolbox frame not found');
    return;
  }

  await toolboxFrame.evaluate((state) => {
    window.globalState = state;
    window.notifyStateSubscribers();
  }, state);
}

const getState = () => {
  return structuredClone(globalState);
}

const updateState = (page: Page, state: typeof globalState) => {
  globalState = structuredClone(state);
  syncToReact(page, state);
}

export { initState, getState, updateState, type Message };
