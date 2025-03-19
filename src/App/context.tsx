import React, { useEffect, useRef } from 'react';
import { Maximize, StopCircle, Image, CircleXIcon, GlobeIcon, KeyboardIcon, MousePointerClickIcon, TextCursorInputIcon, CodeIcon, PlusIcon } from 'lucide-react';
import { useGlobalState } from '@/hooks/use-global-stage';
import { Button } from '@/components/ui/button';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from '@/components/ui/card';
import { ClickToEdit } from '@/components/ui/click-to-edit';
import { BrowserEvent, BrowserEventType } from '@/mcp/recording/events';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface MessageProps {
  message: Message;
  onDelete: (content: string) => void;
}

const truncate = (text: string, maxLength = 25) => {
  return text.length > maxLength ? text.slice(0, maxLength) + '...' : text
}

const MessageCard: React.FC<{
  icon: React.ReactNode,
  title: React.ReactNode,
  content?: React.ReactNode,
  onDelete: () => void
}> = ({ icon, title, content, onDelete }) => {
  return (
    <Card className="group py-4 rounded-sm">
      <CardContent className="px-4 flex gap-2 flex-col">
        <div className="flex gap-2">
          <div className="flex flex-1 gap-2">
            <div className="w-5 h-5 flex items-center justify-center">
              {icon}
            </div>
            <div className="text-sm font-medium text-gray-800">{title}</div>
          </div>
          <div className="">
            <CircleXIcon className="w-4 h-4 transition-opacity duration-200 opacity-0 group-hover:opacity-100 hover:text-destructive cursor-pointer" onClick={onDelete} />
          </div>
        </div>
        {content && (
          <div className="mt-2">
            {content}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const renderInteraction = (message: Message, deleteMessage: () => void) => {
  const rawInteraction = JSON.parse(message.content);
  const interaction = rawInteraction as BrowserEvent;

  const getIcon = (type: BrowserEventType) => {
    switch (type) {
      case BrowserEventType.Click:
        return <MousePointerClickIcon />;
      case BrowserEventType.Input:
        return <TextCursorInputIcon />;
      case BrowserEventType.KeyPress:
        return <KeyboardIcon />;
      case BrowserEventType.OpenPage:
        return <GlobeIcon />;
      default:
        return <GlobeIcon />;
    }
  };

  const getText = (interaction: BrowserEvent) => {
    switch (interaction.type) {
      case BrowserEventType.Click:
        return <>Click on <span className="font-bold text-gray-600 ">"{truncate(interaction.elementName || '')}"</span> {truncate(interaction.elementType || '')}</>;
      case BrowserEventType.Input:
        return <>Type <span className="font-bold text-gray-600 ">"{truncate(interaction.typedText || '')}"</span> in <span className="font-bold text-gray-600">{truncate(interaction.elementName || '')}</span></>;
      case BrowserEventType.KeyPress:
        return <>Press <span className="font-bold text-gray-600 ">{interaction.keys.join(' + ')}</span> key{interaction.keys.length > 1 ? 's' : ''}</>;
      case BrowserEventType.OpenPage:
        return <>Navigate to <span className="font-bold text-gray-600 ">{truncate(interaction.windowUrl || '')}</span></>;
      default:
        return <>Unknown interaction</>;
    }
  };

  const selector = 'selectors' in interaction ? interaction.selectors?.[0] : undefined;

  return (
    <MessageCard
      icon={getIcon(interaction.type)}
      title={getText(interaction)}
      content={selector && (
        <div className="flex flex-col gap-2">
          <ClickToEdit className="text-xs text-muted-foreground bg-gray-100 rounded-sm p-1" placeholder="CSS selector e.g. [data-testid='button']" text={selector} onSave={() => { }} />
        </div>
      )}
      onDelete={deleteMessage}
    />
  );
};

const renderImage = (message: Message, deleteMessage: () => void) => {
  return (
    <MessageCard
      icon={<Image className="text-gray-600" />}
      title="Screenshot captured"
      content={
        <img
          src={`data:image/png;base64,${message.content}`}
          className="rounded w-full"
          alt="Screenshot"
        />
      }
      onDelete={deleteMessage}
    />
  );
};

const renderDom = (message: Message, deleteMessage: () => void) => {
  const chars = message.content.length;

  return (
    <MessageCard
      icon={<CodeIcon className="text-gray-600" />}
      title="DOM Element captured"
      content={
        <div className="bg-gray-50 p-3 rounded">
          <div className="font-mono text-xs overflow-x-auto break-all">
            {message.content.length > 300 ? message.content.slice(0, 297) + '...' : message.content}
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            {chars} characters
          </div>
        </div>
      }
      onDelete={deleteMessage}
    />
  );
};

const MessageComponent: React.FC<MessageProps> = ({ message, onDelete }) => {
  const deleteMessage = () => onDelete(message.content);

  if (message.type === 'Interaction') {
    return renderInteraction(message, deleteMessage);
  }

  if (message.type === 'Image') {
    return renderImage(message, deleteMessage);
  }

  if (message.type === 'DOM') {
    return renderDom(message, deleteMessage);
  }

  return null;
};

const Context: React.FC = () => {
  const [state, updateState] = useGlobalState();
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const prevMessagesLength = useRef(state.messages.length);
  const isFirstRender = useRef(true);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      const scrollArea = messagesContainerRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollArea) {
        scrollArea.scrollTo({
          top: scrollArea.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  };

  useEffect(() => {
    if (state.messages.length > prevMessagesLength.current) {
      setTimeout(() => {
        scrollToBottom();
      }, 200);
    }
    prevMessagesLength.current = state.messages.length;
  }, [state.messages.length]);

  useEffect(() => {
    if (isFirstRender.current) {
      setTimeout(() => {
        scrollToBottom();
      }, 500);
      isFirstRender.current = false;
    }
  }, []);

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

  const messageGroups: Message[][] = []
  state.messages.forEach((message: Message) => {
    const url = message.windowUrl
    const lastMessageGroup = messageGroups.length > 0 ? messageGroups[messageGroups.length - 1] : null
    if (!lastMessageGroup || lastMessageGroup[0].windowUrl !== url) {
      messageGroups.push([message])
    } else {
      lastMessageGroup.push(message)
    }
  });

  const recordingInteractions = state.recordingInteractions;

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      <div className="p-4 flex gap-2">
        <Button
          onClick={toggleRecordingInteractions}
          className="w-40"
        >
          <div className="flex items-center gap-2">
            {recordingInteractions ? (
              <div className="w-3 h-3 bg-red-500" />
            ) : (
              <div className="w-4 h-4 rounded-full bg-red-500" />
            )}
            {recordingInteractions ? 'Stop Recording' : 'Start Recording'}
          </div>
        </Button>
      </div>
      <ScrollArea ref={messagesContainerRef} className="flex-1 max-h-[calc(100vh-194px)] overflow-y-auto">
        {(messageGroups.length > 0 || recordingInteractions) ? (
          <div className="flex flex-col gap-8 p-4">
            {messageGroups.map((messageGroup: Message[], index: number) => (
              <div key={index} className="flex flex-col gap-4">
                <div className="text-sm font-medium text-gray-800 px-1">On page <span className="font-bold text-gray-600 break-all">{truncate(messageGroup[0].windowUrl || '', 120)}</span></div>
                <div className="flex flex-col gap-2">
                  {messageGroup.map((message: Message, index: number) => (
                    <MessageComponent
                      key={index}
                      message={message}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </div>
            ))}
            {recordingInteractions && (
              <div className="flex items-center gap-1 mb-8">
                <div className="mr-2">
                  <div className="w-5 h-5 rounded-full border border-dotted border-gray-300 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                  </div>
                </div>
                <div className="text-gray-700">
                  Recording interaction with browser
                </div>
                <div className="ml-auto relative">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon">
                        <PlusIcon className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="z-[999999]">
                      <DropdownMenuItem onSelect={() => startPicking('DOM')}>
                        <Maximize className="mr-2 h-4 w-4" />
                        <span>Select DOM Element</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => startPicking('Image')}>
                        <Image className="mr-2 h-4 w-4" />
                        <span>Take Screenshot</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2 p-4">
            <div className="text-sm text-muted-foreground">
              No interactions recorded yet!
              <br />
              <br />
              Click 'Start Recording' to record interactions.
              <br />
              <br />
              Once you are done with it, go to your MCP server (like Claude, Cursor),
              ask it to pull context using `get-context` tool and give it instructions
              on what kind of testcase to write .
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default Context;
