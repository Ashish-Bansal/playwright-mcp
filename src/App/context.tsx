import React, { useEffect, useRef } from 'react';
import { Maximize, StopCircle, Image, PlayCircle } from 'lucide-react';
import MessageComponent, { Message } from './Message';
import { useGlobalState } from '@/hooks/use-global-stage';
import { Button } from '@/components/ui/button';

const Context: React.FC = () => {
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

  const toggleRecordingInteractions = () => {
    updateState({
      ...state,
      recordingInteractions: !state.recordingInteractions
    });
  };

  const activePickingType = state.pickingType;
  const recordingInteractions = state.recordingInteractions;

  return (
    <div className="flex-1 flex flex-col">
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
      <div className="p-4 flex gap-2">
        <Button
          onClick={() => activePickingType !== 'DOM' ? startPicking('DOM') : stopPicking()}
          variant="outline"
          className="gap-2"
        >
          {activePickingType === 'DOM' ? <StopCircle size={20} /> : <Maximize size={20} />}
          <span>{activePickingType === 'DOM' ? 'Stop Picking' : 'Pick DOM'}</span>
        </Button>
        <Button
          onClick={() => activePickingType !== 'Image' ? startPicking('Image') : stopPicking()}
          variant="outline"
          className="gap-2"
        >
          {activePickingType === 'Image' ? <StopCircle size={20} /> : <Image size={20} />}
          <span>{activePickingType === 'Image' ? 'Stop Picking' : 'Pick Image'}</span>
        </Button>
        <Button variant="outline" className="gap-2" onClick={toggleRecordingInteractions}>
            {recordingInteractions ? <StopCircle size={20} /> : <PlayCircle size={20} />}
            <span>{recordingInteractions ? 'Stop Recording' : 'Record Interactions'}</span>
        </Button>
      </div>
    </div>
  );
};

export default Context;
