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
import { createAdapter } from '@socket.io/redis-adapter';
import { Server, Socket } from 'socket.io';
import { RedisService } from 'src/common/redis/redis.service';
import { REDIS_CHANNEL_SOCKET_EVENTS } from 'src/common/constants/redis.constant';
import { EventEmitter2 } from '@nestjs/event-emitter';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
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
}
