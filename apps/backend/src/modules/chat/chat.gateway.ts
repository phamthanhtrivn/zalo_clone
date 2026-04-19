/* eslint-disable prettier/prettier */

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessagesService } from '../messages/messages.service';
import { forwardRef, Inject } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    @Inject(forwardRef(() => MessagesService))
    private readonly messagesService: MessagesService
  ) { }

  handleConnection(socket: Socket) {
    const userId = socket.handshake.auth?.userId;

    if (!userId) {
      console.log(`No userId -> disconnect ${socket.id}`);
      return socket.disconnect();
    }

    socket.data.userId = userId;

    socket.join(userId); // Join a room of userId update online event for sidebar

    console.log(`\nUser ${userId} connected with socket ${socket.id}`);

    console.log(`User ${userId} join room: ${userId}`);
  }

  handleDisconnect(socket: Socket) {
    console.log(`User ${socket.data?.userId} disconnected (${socket.id})`);
  }

  // Conversation room
  @SubscribeMessage('join_room')
  handleJoinRoom(
    @MessageBody() conversationId: string,
    @ConnectedSocket() socket: Socket,
  ) {
    socket.join(conversationId);

    console.log(`User ${socket.data.userId} joined room: ${conversationId}`);
  }


  // Conversation room
  @SubscribeMessage('leave_room')
  handleLeaveRoom(
    @MessageBody() coversationId: string,
    @ConnectedSocket() socket: Socket
  ) {
    socket.leave(coversationId);
    console.log(`User ${socket.data.userId} left room: ${coversationId}`);
  }
  // Trong chat.gateway.ts
  @SubscribeMessage('mark_as_read')
  handleMarkAsRead(
    client: Socket,
    data: { userId: string; conversationId: string },
  ) {
    return this.messagesService.readReceiptMessage(data);
  }

  @SubscribeMessage('mark_as_unread')
  handleMarkAsUnread(
    client: Socket,
    data: { userId: string; conversationId: string },
  ) {
    return this.messagesService.markAsUnread(data.userId, data.conversationId);
  }
  emitConversationUpdated(userId: string, conversation: any) {
    this.server.to(userId).emit("conversation_setting:update", conversation);
  }

  emitConversationDeleted(
    userId: string,
    payload: { conversationId: string; deletedAt: Date | null, clearAt: Date | null },
  ) {
    console.log("EMIT DELETE:", userId, payload);
    this.server.to(userId).emit("conversation_setting:delete", payload);
  }
}
