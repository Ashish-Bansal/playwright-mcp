import React from 'react';
import { X } from 'lucide-react';

export interface Message {
  type: 'DOM' | 'Text' | 'Image' | 'Interaction';
  content: string;
}

interface MessageProps {
  message: Message;
  onDelete: (content: string) => void;
}

const MessageComponent: React.FC<MessageProps> = ({ message, onDelete }) => {
  const getTypeStyle = () => {
    switch (message.type) {
      case 'DOM':
        return {
          label: `DOM (${message.content.length} chars)`,
          backgroundColor: '#e3f2fd',
          color: '#1976d2'
        };
      case 'Text':
      case 'Image':
        return {
          label: message.type,
          backgroundColor: '#e8f5e9',
          color: '#388e3c'
        };
      case 'Interaction':
        return {
          label: 'Interaction',
          backgroundColor: '#e8f5e9',
          color: '#388e3c'
        };
    }
  };

  const typeStyle = getTypeStyle();

  return (
    <div className="p-2 border-b border-gray-200 break-all flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <span className="px-1.5 py-0.5 rounded text-xs font-medium" style={{
          backgroundColor: typeStyle.backgroundColor,
          color: typeStyle.color
        }}>
          {typeStyle.label}
        </span>
        <button
          onClick={() => onDelete(message.content)}
          className="bg-transparent border-none text-gray-500 cursor-pointer text-base p-1 hover:text-gray-700"
        >
          <X size={16} />
        </button>
      </div>

      <div>
        {message.type === 'Image' ? (
          <img
            src={`data:image/png;base64,${message.content}`}
            className="max-w-full rounded"
            alt="Screenshot"
          />
        ) : (
          <div className={message.type === 'DOM' ? 'font-mono text-xs' : ''}>
            {message.content.length > 300 ? message.content.slice(0, 297) + '...' : message.content}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageComponent;