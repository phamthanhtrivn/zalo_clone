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
import { CallStatus } from 'src/common/types/enums/call-status';
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
    private readonly messageService: MessagesService,
  ) {}

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
    const userId = socket.data?.userId;
    if (userId) {
      console.log(`User ${userId} disconnected`);
      if (socket.data.currentCallId) {
        this.server
          .to(socket.data.currentCallId)
          .emit('call:user_disconnected', { userId });
      }
    }
  }

  // Tham gia phòng chat
  @SubscribeMessage('join_room')
  handleJoinRoom(
    @MessageBody() conversationId: string,
    @ConnectedSocket() socket: Socket,
  ) {
    socket.join(conversationId);
    console.log(`User ${socket.data.userId} joined room: ${conversationId}`);
  }

  // Rời phòng chat (Từ nhánh PhamThanhTri)
  @SubscribeMessage('leave_room')
  handleLeaveRoom(
    @MessageBody() conversationId: string,
    @ConnectedSocket() socket: Socket,
  ) {
    socket.leave(conversationId);
    console.log(`User ${socket.data.userId} left room: ${conversationId}`);
  }

  // Gửi tín hiệu WebRTC (Offer, Answer, ICE Candidates)
  @SubscribeMessage('call:signal')
  handleCallSignal(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: any,
  ) {
    console.log(`\n--- GIAO DỊCH TÍN HIỆU ---`);
    console.log(`Từ: ${socket.data.userId}`);
    console.log(`Tới UserID: ${data.to}`);

    socket.data.currentCallId = data.conversationId;

    // KIỂM TRA XEM ROOM CÓ AI KHÔNG
    const room = this.server.sockets.adapter.rooms.get(data.to);
    console.log(
      `Số lượng socket trong room người nhận (${data.to}):`,
      room ? room.size : 0,
    );

    this.server.to(data.to).emit('call:signal', {
      ...data,
      from: socket.data.userId,
    });
  }

  // Thông báo khi người nghe bận hoặc từ chối từ phía UI
  @SubscribeMessage('call:reject')
  async handleCallReject(
    @ConnectedSocket() socket: Socket,
    @MessageBody()
    data: {
      to: string;
      conversationId: string;
      reason: string;
      messageId: string;
    },
  ) {
    delete socket.data.currentCallId;
    this.server.to(data.to).emit('call:rejected', {
      from: socket.data.userId,
      conversationId: data.conversationId,
      reason: data.reason,
    });
    if (data.messageId) {
      await this.messageService.updateCallMessage({
        messageId: data.messageId,
        conversationId: data.conversationId,
        status: CallStatus.REJECTED,
      });
    }
  }

  // Cúp máy chủ động
  @SubscribeMessage('call:end')
  async handleCallEnd(
    @ConnectedSocket() socket: Socket,
    @MessageBody()
    data: {
      to: string;
      conversationId: string;
      status: CallStatus;
      messageId: string;
    },
  ) {
    delete socket.data.currentCallId;
    this.server.to(data.to).emit('call:ended', {
      from: socket.data.userId,
      conversationId: data.conversationId,
    });

    if (data.messageId) {
      const finalStatus = data.status || CallStatus.ENDED;
      await this.messageService.updateCallMessage({
        messageId: data.messageId,
        conversationId: data.conversationId,
        status: finalStatus,
      });
    }
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
}
