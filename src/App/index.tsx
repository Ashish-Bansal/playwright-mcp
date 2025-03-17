import { useGlobalState } from '@/hooks/use-global-stage';
import React, { useEffect, useRef } from 'react';
import { Maximize, StopCircle, Image } from 'lucide-react';
import MessageComponent, { Message } from './Message';

const App: React.FC = () => {
  const [state, updateState] = useGlobalState();
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [state.messages]);

  const handleDelete = (content: string) => {
    updateState({
      ...state,
      messages: state.messages.filter((m: Message) => m.content !== content)
    });
  };

  const stopPicking = () => {
    updateState({
      ...state,
      pickingType: null
    });
    window.triggerMcpStopPicking();
  };

  const startPicking = (type: 'DOM' | 'Image') => {
    updateState({
      ...state,
      pickingType: type
    });
    window.triggerMcpStartPicking(type);
  };

  const activePickingType = state.pickingType;

  return (
    <div className="fixed top-0 right-0 w-full h-screen bg-gray-100 border-l border-zinc-200 z-[999999] flex flex-col overflow-hidden">
      <div className="p-4 bg-white border-b border-zinc-200 flex items-center justify-center">
        <h3 className="m-0 text-base font-medium text-gray-900">
          Playwright MCP
        </h3>
      </div>

      <div className="p-4 bg-white border-b border-zinc-200 flex gap-2">
        <button
          onClick={() => activePickingType !== 'DOM' ? startPicking('DOM') : stopPicking()}
          className="text-zinc-900 border border-zinc-200 rounded-md cursor-pointer h-9 px-3 flex items-center justify-center gap-2"
        >
          {activePickingType === 'DOM' ? <StopCircle size={20} /> : <Maximize size={20} />}
          <span>{activePickingType === 'DOM' ? 'Stop Picking' : 'Pick DOM'}</span>
        </button>
        <button
          onClick={() => activePickingType !== 'Image' ? startPicking('Image') : stopPicking()}
          className="text-zinc-900 border border-zinc-200 rounded-md cursor-pointer h-9 px-3 flex items-center justify-center gap-2"
        >
          {activePickingType === 'Image' ? <StopCircle size={20} /> : <Image size={20} />}
          <span>{activePickingType === 'Image' ? 'Stop Picking' : 'Pick Image'}</span>
        </button>
      </div>

      <div
        ref={messagesContainerRef}
        className="flex-1 flex flex-col gap-2 p-4 overflow-y-auto"
      >
        {state.messages.map((message: Message, index: number) => (
          <MessageComponent
            key={index}
            message={message}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
};

export default App;
