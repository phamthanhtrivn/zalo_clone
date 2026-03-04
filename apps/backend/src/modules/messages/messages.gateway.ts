import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class MessagesGateway {
  @WebSocketServer() server: Server;

  @SubscribeMessage('join_conversation')
  handleJoin(
    @ConnectedSocket() socket: Socket,
    @MessageBody() conversationId: string,
  ) {
    socket.join(conversationId);
  }
}
