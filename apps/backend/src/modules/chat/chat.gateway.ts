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
import { TokenService } from 'src/common/jwt-token/jwt.service';
import { MessagesCallService } from '../messages/services/call.service';
import { CallStatus } from 'src/common/types/enums/call-status';
@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    @Inject(forwardRef(() => MessagesService))
    private readonly messagesService: MessagesService,
    private readonly messagesCallService: MessagesCallService,
    private readonly redisService: RedisService,
    private readonly eventEmitter: EventEmitter2,
    private readonly tokenService: TokenService,
  ) {}

  handleConnection(socket: Socket) {
    const token = socket.handshake.auth?.token as string;
    const deviceId = socket.handshake.auth?.deviceId as string;

    if (!token || !deviceId) {
      console.log(`No token -> disconnect ${socket.id}`);
      return socket.disconnect();
    }

    try {
      const payload = this.tokenService.verifyAccessToken(token);

      socket.data.userId = payload.userId;
      socket.data.deviceId = deviceId;

      const userId = payload.userId;

      socket.join(userId); // Join a room of userId update online event for sidebar
      socket.join(deviceId); // Phòng dùng cho AuthService

      console.log(`\nUser ${userId} connected with socket ${socket.id}`);
      console.log(`User ${userId} join room: ${userId}`);
    } catch (err: any) {
      console.log(`Lỗi xác thực Socket (${socket.id}):`, err.message);

      socket.disconnect();
    }
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

      if (event === 'ai_status' || event === 'ai_typing_chunk') {
        this.server.to(room).emit(event, data);
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

      console.log(
        `✅ User ${data.userId} marked ${data.conversationId} as read`,
      );
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

      console.log(
        `✅ User ${data.userId} marked ${data.conversationId} as unread`,
      );
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
    this.server.to(userId).emit('conversation_setting:update', conversation);
  }

  emitConversationDeleted(
    userId: string,
    payload: {
      conversationId: string;
      deletedAt: Date | null;
      clearAt: Date | null;
    },
  ) {
    console.log('EMIT DELETE:', userId, payload);
    this.server.to(userId).emit('conversation_setting:delete', payload);
  }

  handleKickUserFromRoom(userId: string, conversationId: string) {
    this.server.in(userId).socketsLeave(conversationId);
    console.log(
      `Socket: User ${userId} forced to leave room ${conversationId}`,
    );
  }
  handleUserJoinRoom(userId: string, conversationId: string) {
    this.server.in(userId).socketsJoin(conversationId);
    console.log(`Socket: User ${userId} forced to join room ${conversationId}`);
  }

  //gửi sự kiện kêu gọi đăng xuất ra một thiết bị cụ thể
  forceLogoutDevice(deviceId: string) {
    this.server.to(deviceId).emit('force_logout', {
      message: 'Phiên đăng nhập đã hết hạn hoặc bạn bị đăng xuất từ nơi khác.',
    });
  }

  // --- WebRTC Signaling Handlers ---

  @SubscribeMessage('call:signal')
  async handleCallSignal(
    @MessageBody() data: any,
    @ConnectedSocket() client: Socket,
  ) {
    // Phase 3: Check for answer signal to update DB status
    if (data.signal?.type === 'answer' && data.messageId) {
      try {
        await this.messagesCallService.updateCallMessage({
          messageId: data.messageId,
          conversationId: data.conversationId,
          status: CallStatus.ACCEPTED,
        });
      } catch (err) {
        console.warn(
          '[Socket] Failed to update call to ACCEPTED:',
          err.message,
        );
      }
    }

    this.server.to(data.to).emit('call:signal', {
      ...data,
      from: client.data.userId,
    });
  }

  @SubscribeMessage('call:reject')
  async handleCallReject(
    @MessageBody() data: any,
    @ConnectedSocket() client: Socket,
  ) {
    // Phase 1: Update DB on reject
    if (data.messageId) {
      try {
        await this.messagesCallService.updateCallMessage({
          messageId: data.messageId,
          conversationId: data.conversationId,
          status: CallStatus.REJECTED,
        });
      } catch (err) {
        console.warn(
          '[Socket] Failed to update call to REJECTED:',
          err.message,
        );
      }
    }

    this.server.to(data.to).emit('call:rejected', {
      ...data,
      from: client.data.userId,
    });
  }

  @SubscribeMessage('call:end')
  async handleCallEnd(
    @MessageBody() data: any,
    @ConnectedSocket() client: Socket,
  ) {
    // Phase 1: Update DB on end
    if (data.messageId) {
      try {
        await this.messagesCallService.updateCallMessage({
          messageId: data.messageId,
          conversationId: data.conversationId,
          status: data.status || CallStatus.ENDED,
        });
      } catch (err) {
        console.warn('[Socket] Failed to update call to ENDED:', err.message);
      }
    }

    this.server.to(data.to).emit('call:ended', {
      ...data,
      from: client.data.userId,
    });
  }

  @SubscribeMessage('call:respond_status')
  handleCallRespondStatus(
    @MessageBody() data: any,
    @ConnectedSocket() client: Socket,
  ) {
    console.log(
      `[Socket] Forwarding call:respond_status from ${client.data.userId} to ${data.to}`,
    );
    this.server.to(data.to).emit('call:signal', {
      ...data,
      from: client.data.userId,
    });
  }
  //AI event
  //Dùng để ngắt AI trả lời
  @SubscribeMessage('stop_ai_generation')
  handleStopAi(socket: Socket, payload: { conversationId: string }) {
    this.eventEmitter.emit('ai.stop_generation', {
      conversationId: payload.conversationId,
      userId: socket.data.userId as string,
    });
  }

  async emitAiChunk(targetId: string, text: string, isFinished: boolean) {
    return this.redisService.publish(REDIS_CHANNEL_SOCKET_EVENTS, {
      room: targetId,
      event: 'ai_typing_chunk',
      data: { targetId, text, isFinished },
    });
  }

  async emitAiStatus(targetId: string, status: 'thinking' | 'typing' | null) {
    return this.redisService.publish(REDIS_CHANNEL_SOCKET_EVENTS, {
      room: targetId,
      event: 'ai_status',
      data: { targetId, status },
    });
  }

  async emitNewMessage(targetId: string, message: any) {
    return this.redisService.publish(REDIS_CHANNEL_SOCKET_EVENTS, {
      room: targetId,
      event: 'new_message',
      data: message,
    });
  }
}
