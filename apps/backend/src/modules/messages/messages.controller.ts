import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { SendMessageDto } from './dto/send-message.dto';
import { PinnedMessageDto } from './dto/pinned-message.dto';
import { RecalledMessageDto } from './dto/recalled-message.dto';
import { ReactionDto } from './dto/reaction.dto';
import { RemoveReactionDto } from './dto/remove-reaction.dto';
import { ReadReceiptDto } from './dto/read-reciept.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { CallMessageDto } from './dto/call-message.dto';
import { UpdateCallMessageDto } from './dto/update-call-message.dto';
import { GetMessagesDto } from './dto/get-messages.dto';
import { GetMediasPreviewDto } from './dto/get-medias-preview.dto';
import { GetMediasFileTypeDto } from './dto/get-medias-file-type.dto';

@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('conversation/:conversationId')
  async getMessagesFromConversation(
    @Param('conversationId') conversationId: string,
    @Query() getMessagesDto: GetMessagesDto,
  ) {
    return this.messagesService.getMessagesFromConversation(
      conversationId,
      getMessagesDto,
    );
  }

  @Get('conversation/:conversationId/medias/preview')
  async getMediasPreview(
    @Param('conversationId') conversationId: string,
    @Query() getMediasPreviewDto: GetMediasPreviewDto,
  ) {
    return this.messagesService.getMediasPreview(
      conversationId,
      getMediasPreviewDto,
    );
  }

  @Get('conversation/:conversationId/medias')
  async getMedias(
    @Param('conversationId') conversationId: string,
    @Query() getMediasFileTypeDto: GetMediasFileTypeDto,
  ) {
    return this.messagesService.getMediasFileType(
      conversationId,
      getMediasFileTypeDto,
    );
  }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async sendMessage(
    @Body() sendMessageDto: SendMessageDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.messagesService.sendMessage(sendMessageDto, file);
  }

  @Post('call')
  async sendCallMessage(@Body() callMessageDto: CallMessageDto) {
    return this.messagesService.createCallMessage(callMessageDto);
  }

  @Patch('call')
  async updateCallMessage(@Body() updateCallMessageDto: UpdateCallMessageDto) {
    return this.messagesService.updateCallMessage(updateCallMessageDto);
  }

  @Patch('pinned')
  async pinnedMessage(@Body() pinnedMessageDto: PinnedMessageDto) {
    return this.messagesService.pinnedMessage(pinnedMessageDto);
  }

  @Patch('recalled')
  async recalledMessage(@Body() recalledMessageDto: RecalledMessageDto) {
    return this.messagesService.recalledMessage(recalledMessageDto);
  }

  @Patch('reaction')
  async reactionMessage(@Body() reactionDto: ReactionDto) {
    return this.messagesService.reactionMessage(reactionDto);
  }

  @Patch('remove-reaction')
  async removeReaction(@Body() removeReactionDto: RemoveReactionDto) {
    return this.messagesService.removeReactionMessage(removeReactionDto);
  }

  @Patch('read-receipt')
  async readReceipt(@Body() readReceiptDto: ReadReceiptDto) {
    return this.messagesService.readReceiptMessage(readReceiptDto);
  }
}
