import { Injectable } from '@nestjs/common';
import { SendMessageDto } from './dto/send-message.dto';
import { PinnedMessageDto } from './dto/pinned-message.dto';
import { RecalledMessageDto } from './dto/recalled-message.dto';
import { ReactionDto } from './dto/reaction.dto';
import { RemoveReactionDto } from './dto/remove-reaction.dto';
import { ReadReceiptDto } from './dto/read-reciept.dto';
import { CallMessageDto } from './dto/call-message.dto';
import { UpdateCallMessageDto } from './dto/update-call-message.dto';
import { GetMessagesDto } from './dto/get-messages.dto';
import { GetMediasPreviewDto } from './dto/get-medias-preview.dto';
import { GetMediasFileTypeDto } from './dto/get-medias-file-type.dto';

import { GetPinnedMessagesDto } from './dto/get-pinned-messages.dto';
import { GetAroundPinnedMessage } from './dto/get-around-pinned-message.dto';
import { DeleteMessageForMeDto } from './dto/delete-message-for-me.dto';
import { ForwardMessageDto } from './dto/forward-message.dto';

import { MessagesQueryService } from './services/query.service';
import { MessagesActionService } from './services/action.service';
import { MessagesCallService } from './services/call.service';

@Injectable()
export class MessagesService {
  constructor(
    private readonly queryService: MessagesQueryService,
    private readonly actionService: MessagesActionService,
    private readonly callService: MessagesCallService,
  ) { }

  // --- Query Methods ---

  async getMessagesFromConversation(
    conversationId: string,
    getMessagesDto: GetMessagesDto,
  ) {
    return this.queryService.getMessagesFromConversation(
      conversationId,
      getMessagesDto,
    );
  }

  async getNewerMessages(
    conversationId: string,
    getMessagesDto: GetMessagesDto,
  ) {
    return this.queryService.getNewerMessages(conversationId, getMessagesDto);
  }

  async getMessagesAroundPinnedMessage(
    conversationId: string,
    getAroundPinnedMessage: GetAroundPinnedMessage,
  ) {
    return this.queryService.getMessagesAroundPinnedMessage(
      conversationId,
      getAroundPinnedMessage,
    );
  }

  async getPinnedMessagesFromConversation(
    conversationId: string,
    getPinnedMessagesDto: GetPinnedMessagesDto,
  ) {
    return this.queryService.getPinnedMessagesFromConversation(
      conversationId,
      getPinnedMessagesDto,
    );
  }

  async getMediasPreview(
    conversationId: string,
    getMediasPreviewDto: GetMediasPreviewDto,
  ) {
    return this.queryService.getMediasPreview(
      conversationId,
      getMediasPreviewDto,
    );
  }

  async getMediasFileType(
    conversationId: string,
    getMediasFileTypeDto: GetMediasFileTypeDto,
  ) {
    return this.queryService.getMediasFileType(
      conversationId,
      getMediasFileTypeDto,
    );
  }

  // --- Action Methods ---

  async sendMessage(
    sendMessageDto: SendMessageDto,
    files?: Express.Multer.File[],
  ) {
    return this.actionService.sendMessage(sendMessageDto, files);
  }

  async recalledMessage(recalledMessageDto: RecalledMessageDto) {
    return this.actionService.recalledMessage(recalledMessageDto);
  }

  async deleteMessageForMe(deleteMessageForMeDto: DeleteMessageForMeDto) {
    return this.actionService.deleteMessageForMe(deleteMessageForMeDto);
  }

  async forwardMessages(dto: ForwardMessageDto) {
    return this.actionService.forwardMessages(dto);
  }

  async reactionMessage(reactionDto: ReactionDto) {
    return this.actionService.reactionMessage(reactionDto);
  }

  async removeReactionMessage(removeReactionDto: RemoveReactionDto) {
    return this.actionService.removeReactionMessage(removeReactionDto);
  }

  async readReceiptMessage(readReceiptDto: ReadReceiptDto) {
    return this.actionService.readReceiptMessage(readReceiptDto);
  }

  async pinnedMessage(pinnedMessageDto: PinnedMessageDto) {
    return this.actionService.pinnedMessage(pinnedMessageDto);
  }

  // --- Call Methods ---

  async createCallMessage(callMessageDto: CallMessageDto) {
    return this.callService.createCallMessage(callMessageDto);
  }

  async updateCallMessage(updateCallMessageDto: UpdateCallMessageDto) {
    return this.callService.updateCallMessage(updateCallMessageDto);
  }
}
