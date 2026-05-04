import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { SendMessageDto } from './dto/send-message.dto';
import { SendVoiceMessageDto } from './dto/send-voice-message.dto';
import { PinnedMessageDto } from './dto/pinned-message.dto';
import { RecalledMessageDto } from './dto/recalled-message.dto';
import { ReactionDto } from './dto/reaction.dto';
import { RemoveReactionDto } from './dto/remove-reaction.dto';
import { ReadReceiptDto } from './dto/read-reciept.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CallMessageDto } from './dto/call-message.dto';
import { UpdateCallMessageDto } from './dto/update-call-message.dto';
import { GetMessagesDto } from './dto/get-messages.dto';
import { GetMediasPreviewDto } from './dto/get-medias-preview.dto';
import { GetMediasFileTypeDto } from './dto/get-medias-file-type.dto';
import { GetAroundPinnedMessage } from './dto/get-around-pinned-message.dto';
import { GetPinnedMessagesDto } from './dto/get-pinned-messages.dto';
import { DeleteMessageForMeDto } from './dto/delete-message-for-me.dto';
import { ForwardMessageDto } from './dto/forward-message.dto';
import { SearchMessagesDto } from './dto/search-messages.dto';

import { PollService } from './services/poll.service';
import { CreatePollDto } from './dto/create-poll.dto';
import { VotePollDto } from './dto/vote-poll.dto';
import { Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/passport/jwt-auth.guard';

@Controller('messages')
export class MessagesController {
  constructor(
    private readonly messagesService: MessagesService,
    private readonly pollService: PollService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('conversation/:conversationId/polls')
  async getPolls(
    @Req() req: any,
    @Param('conversationId') conversationId: string,
  ) {
    return this.messagesService.getPollMessagesFromConversation(
      conversationId,
      req.user.userId,
    );
  }

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

  @Get('conversation/:conversationId/search')
  async searchMessages(
    @Param('conversationId') conversationId: string,
    @Query() searchDto: SearchMessagesDto,
  ) {
    return this.messagesService.searchMessages(conversationId, searchDto);
  }

  @Get('conversation/:conversationId/newer')
  async getNewerMessages(
    @Param('conversationId') conversationId: string,
    @Query() getMessagesDto: GetMessagesDto,
  ) {
    return this.messagesService.getNewerMessages(
      conversationId,
      getMessagesDto,
    );
  }

  @Get('conversation/:conversationId/around')
  async getMessagesAroundPinnedMessage(
    @Param('conversationId') conversationId: string,
    @Query() getAroundPinnedMessage: GetAroundPinnedMessage,
  ) {
    return this.messagesService.getMessagesAroundPinnedMessage(
      conversationId,
      getAroundPinnedMessage,
    );
  }

  @Get('conversation/:conversationId/pinned')
  async getPinnedMessagesFromConversation(
    @Param('conversationId') conversationId: string,
    @Query() getPinnedMessagesDto: GetPinnedMessagesDto,
  ) {
    return this.messagesService.getPinnedMessagesFromConversation(
      conversationId,
      getPinnedMessagesDto,
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
  @UseInterceptors(FilesInterceptor('files'))
  async sendMessage(
    @Body() sendMessageDto: SendMessageDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.messagesService.handleIncomingMessage(sendMessageDto, files);
  }

  @Post('voice')
  @UseInterceptors(FilesInterceptor('files', 1))
  async sendVoiceMessage(
    @Body() sendVoiceMessageDto: SendVoiceMessageDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.messagesService.sendVoiceMessage(sendVoiceMessageDto, files);
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

  @Patch('delete-for-me')
  async deleteMessageForMe(
    @Body() deleteMessageForMeDto: DeleteMessageForMeDto,
  ) {
    return this.messagesService.deleteMessageForMe(deleteMessageForMeDto);
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

  @Post('forward')
  async forwardMessages(@Body() dto: ForwardMessageDto) {
    return this.messagesService.forwardMessages(dto);
  }

  /**
   * TẠO BÌNH CHỌN MỚI
   * POST /messages/conversation/:conversationId/poll
   */
  @UseGuards(JwtAuthGuard)
  @Post('conversation/:conversationId/poll')
  async createPoll(
    @Req() req: any,
    @Param('conversationId') conversationId: string,
    @Body() dto: CreatePollDto,
  ) {
    const userId = req.user.userId;
    return this.pollService.createPoll(userId, conversationId, dto);
  }

  /**
   * THỰC HIỆN VOTE
   * POST /messages/conversation/:conversationId/poll/vote
   */
  @UseGuards(JwtAuthGuard)
  @Post('conversation/:conversationId/poll/vote')
  async votePoll(
    @Req() req: any,
    @Param('conversationId') conversationId: string,
    @Body() dto: VotePollDto,
  ) {
    const userId = req.user.userId;
    return this.pollService.vote(userId, conversationId, dto);
  }

  /**
   * THÊM PHƯƠNG ÁN MỚI
   * PATCH /messages/conversation/:conversationId/poll/:pollId/option
   */
  @UseGuards(JwtAuthGuard)
  @Patch('conversation/:conversationId/poll/:pollId/option')
  async addPollOption(
    @Req() req: any,
    @Param('conversationId') conversationId: string,
    @Param('pollId') pollId: string,
    @Body('text') text: string,
  ) {
    const userId = req.user.userId;
    return this.pollService.addOption(userId, conversationId, pollId, text);
  }
}
