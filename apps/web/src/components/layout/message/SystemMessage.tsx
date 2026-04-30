import React from 'react';
import type { MessagesType } from '@/types/messages.type';
import { formatTime } from '@/utils/format-message-time..util';

interface SystemMessageProps {
  message: MessagesType;
}

export const SystemMessage: React.FC<SystemMessageProps> = ({ message }) => {
  return (
    <div className="flex flex-col items-center justify-center my-6 w-full px-10 animate-in fade-in duration-500">
      <div className="max-w-[90%] text-center space-y-1">
        <p className="text-[12px] text-gray-400 italic leading-tight font-medium">
          {message.content?.text}
        </p>
        {message.createdAt && (
          <p className="text-[10px] text-gray-300 font-normal">
            {formatTime(message.createdAt)}
          </p>
        )}
      </div>
    </div>
  );
};

export default SystemMessage;
