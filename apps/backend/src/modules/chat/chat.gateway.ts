/* eslint-disable prettier/prettier */

import { ConfigService } from '@nestjs/config';
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
import { createAdapter } from '@socket.io/redis-adapter';
import { RedisService } from 'src/common/redis/redis.service';
import { REDIS_CHANNEL_SOCKET_EVENTS } from 'src/common/constants/redis.constant';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Types } from 'mongoose';
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
    private readonly messagesService: MessagesService,
    private readonly redisService: RedisService,
    private readonly eventEmitter: EventEmitter2
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
  async afterInit() {
    const pubClient = this.redisService.getClient();
    const subClient = this.redisService.createDuplicateClient();

    this.server.adapter(createAdapter(pubClient, subClient));

    // Subscribe to custom redis events for multi-instance support
    this.redisService.subscribe(REDIS_CHANNEL_SOCKET_EVENTS, (payload: any) => {
      const { event, room, data } = payload;

      if (event === 'internal_force_read_receipt') {
        const { senderId, conversationId } = data;
        const roomSockets = this.server.sockets.adapter.rooms.get(room);
        if (roomSockets) {
          for (const socketId of roomSockets) {
            const socket: any = this.server.sockets.sockets.get(socketId);
            if (socket?.data?.userId !== senderId) {
              this.eventEmitter.emit('message.force_read_receipt', {
                userId: socket.data.userId,
                conversationId,
              });
            }
          }
        }
        return;
      }

      if (event && room) {
        this.server.to(room).emit(event, data);
      }
    });

    console.log('Redis adapter and custom pub/sub listener connected'); // for chat gateway to serve multiple instances (server when deploy)
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
    @ConnectedSocket() socket: Socket,
  ) {
    socket.leave(coversationId);
    console.log(`User ${socket.data.userId} left room: ${coversationId}`);
  }
  // Trong chat.gateway.ts
  // chat.gateway.ts
  // chat.gateway.ts
  @SubscribeMessage('mark_as_read')
  async handleMarkAsRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string; conversationId: string },
  ) {
    try {
      const result = await this.messagesService.readReceiptMessage(data);
      const lastReadMessageId =
        result.lastReadMessageId instanceof Types.ObjectId
          ? result.lastReadMessageId
          : null;

      // ✅ Lấy messages đã được cập nhật
      const updatedMessages =
        await this.messagesService.getUpdatedMessagesAfterReadReceipt(
          data.conversationId,
          data.userId,
          lastReadMessageId,
        );

      // 📤 Emit read_receipt để cập nhật icon đã đọc
      this.server.to(data.conversationId).emit('read_receipt', {
        conversationId: data.conversationId,
        messages: updatedMessages,
      });

      // 🔑 KEY: Emit callback success CHỈ cho user hiện tại
      client.emit('mark_as_read:success', {
        conversationId: data.conversationId,
        unreadCount: 0,
      });
      this.server.to(data.userId).emit('mark_as_read:broadcast', {
        conversationId: data.conversationId,
        unreadCount: 0,
      });
      // ✅ Broadcast conversation:update cho USERS KHÁC
      const members = await this.messagesService.getConversationMembers(
        data.conversationId,
      );

      for (const member of members) {
        const isCurrentUser = member.userId.toString() === data.userId;

        if (!isCurrentUser) {
          // Chỉ broadcast cho users khác
          this.server.to(member.userId.toString()).emit('conversation:update', {
            conversationId: data.conversationId,
            unreadCount: member.unreadCount || 0,
          });
        }
      }

      console.log(`✅ User ${data.userId} marked ${data.conversationId} as read`);
      return { success: true, unreadCount: 0 };
    } catch (error) {
      console.error('Mark as read error:', error);
      client.emit('mark_as_read:error', {
        conversationId: data.conversationId,
        message: 'Failed to mark as read',
      });
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('mark_as_unread')
  async handleMarkAsUnread(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string; conversationId: string },
  ) {
    try {
      const result = await this.messagesService.markAsUnread(
        data.userId,
        data.conversationId,
      );

      // 📤 Emit read_receipt để xóa icon đã đọc
      if (result.messagesToUpdate && result.messagesToUpdate.length > 0) {
        this.server.to(data.conversationId).emit('read_receipt', {
          conversationId: data.conversationId,
          messages: result.messagesToUpdate,
        });
      }

      // 🔑 KEY: Emit callback success CHỈ cho user hiện tại
      client.emit('mark_as_unread:success', {
        conversationId: data.conversationId,
        unreadCount: result.unreadCount,
      });
      this.server.to(data.userId).emit('mark_as_unread:broadcast', {
        conversationId: data.conversationId,
        unreadCount: result.unreadCount,
      });

      // ✅ Broadcast conversation:update cho USERS KHÁC
      const members = await this.messagesService.getConversationMembers(
        data.conversationId,
      );

      for (const member of members) {
        const isCurrentUser = member.userId.toString() === data.userId;

        if (!isCurrentUser) {
          // Chỉ broadcast cho users khác
          this.server.to(member.userId.toString()).emit('conversation:update', {
            conversationId: data.conversationId,
            unreadCount: member.unreadCount || 0,
          });
        }
      }

      console.log(`✅ User ${data.userId} marked ${data.conversationId} as unread`);
      return { success: true, unreadCount: result.unreadCount };
    } catch (error) {
      console.error('Mark as unread error:', error);
      client.emit('mark_as_unread:error', {
        conversationId: data.conversationId,
        message: 'Failed to mark as unread',
      });
      return { success: false, error: error.message };
    }
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

  handleKickUserFromRoom(targetUserId, convIdStr) {

  }
  handleUserJoinRoom(uid, convIdStr){}
}