import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { TransferOwnerDto } from './dto/transfer-owner.dto';
import { RemoveMemberDto } from './dto/remove-member.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { JwtAuthGuard } from '../auth/passport/jwt-auth.guard';

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  async getMyConversations(@Req() req) {
    const userId = req.user.userId;
    return this.conversationsService.getConversationsFromUser(userId);
  }

  // API 2: Tạo hoặc Lấy chat 1-1 (Zalo: Click vào bạn bè là mở chat)
  @Post('direct')
  async getOrCreateDirect(
    @Req() req,
    @Body('targetUserId') targetUserId: string,
  ) {
    const userId = req.user.userId;
    return this.conversationsService.getOrCreateDirectConversation(
      userId,
      targetUserId,
    );
  }

  @Post('group')
  //   @UseGuards()
  async createGroup(@Req() req, @Body() createGroupDto: CreateGroupDto) {
    const userId = req.user.userId;

    return this.conversationsService.createGroup(userId, createGroupDto);
  }

  @Delete(':id')
  async deleteGroup(@Param('id') id: string, @Req() req) {
    const userId = req.user.userId;

    return this.conversationsService.deleteGroup(id, userId);
  }

  @Patch(':id/members/role')
  async updateMembersRole(
    @Param('id') id: string,
    @Req() req,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    const userId = req.user.userId;

    return this.conversationsService.updateMembersRole(id, userId, dto);
  }

  @Post(':id/transfer-owner')
  async transferOwner(
    @Param('id') id: string,
    @Req() req,
    @Body() dto: TransferOwnerDto,
  ) {
    const currentOwnerId = req.user.userId;

    return this.conversationsService.transferOwner(id, currentOwnerId, dto);
  }

  @Delete(':id/remove-member')
  async removeMember(
    @Param('id') id: string,
    @Req() req,
    @Body() dto: RemoveMemberDto,
  ) {
    const actorId = req.user.userId;

    return this.conversationsService.removeMember(id, actorId, dto);
  }

  @Post(':id/add-members')
  async addMembers(
    @Param('id') id: string,
    @Req() req,
    @Body() dto: AddMemberDto,
  ) {
    const actorId = String(req.user?.userId ?? '');
    if (!actorId) {
      throw new ForbiddenException('Không xác định được người dùng');
    }
    return this.conversationsService.addMember(id, actorId, dto);
  }

  @Get('/user/:userId')
  async getConversationsFromUserId(@Param('userId') userId: string) {
    return this.conversationsService.getConversationsFromUser(userId);
  }

  @Get(':id/members')
  async getConversationMembers(@Param('id') id: string, @Req() req) {
    const userId = req.user.userId;
    return this.conversationsService.getConversationMembers(id, userId);
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @Req() req) {
    const userId = req.user.userId;
    return this.conversationsService.markAsRead(id, userId);
  }

  @Post(':id/leave')
  async leaveGroup(@Param('id') id: string, @Req() req) {
    const userId = req.user.userId;
    return this.conversationsService.leaveGroup(id, userId);
  }
}
