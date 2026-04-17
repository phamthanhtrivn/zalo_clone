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
import { TokenService } from '../../common/jwt-token/jwt.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly tokenService: TokenService) {}

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

  forceLogoutDevice(deviceId: string) {
    this.server.to(deviceId).emit('force_logout', {
      message: 'Phiên đăng nhập đã hết hạn hoặc bạn bị đăng xuất từ nơi khác.',
    });
  }
}
