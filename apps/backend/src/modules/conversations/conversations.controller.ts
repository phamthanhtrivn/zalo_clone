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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { TransferOwnerDto } from './dto/transfer-owner.dto';
import { RemoveMemberDto } from './dto/remove-member.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { JwtAuthGuard } from '../auth/passport/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';

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

  @Delete(':id/members/:memberId')
  async removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Req() req,
  ) {
    const actorId = req.user.userId;

    return this.conversationsService.removeMember(id, actorId, memberId);
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
  async getConversationsFromUserId(
    @Param('userId') userId: string,
    @Req() req,
  ) {
    if (req.user.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền xem danh sách này');
    }
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

  @Patch(':id/settings')
  async updateGroupSettings(
    @Param('id') id: string,
    @Req() req,
    @Body()
    dto: {
      allowMembersInvite?: boolean;
      approvalRequired?: boolean;
      allowMembersSendMessages?: boolean;
    },
  ) {
    const userId = req.user.userId;
    return this.conversationsService.updateGroupSettings(id, userId, dto);
  }

  @Get(':id/join-requests')
  async getJoinRequests(@Param('id') id: string, @Req() req) {
    const userId = req.user.userId;
    return this.conversationsService.getJoinRequests(id, userId);
  }

  @Post(':id/join-requests/:requestId/approve')
  async approveRequest(
    @Param('id') id: string,
    @Param('requestId') requestId: string,
    @Req() req,
  ) {
    const actorId = req.user.userId;
    return this.conversationsService.handleJoinRequest(
      id,
      requestId,
      actorId,
      'APPROVED',
    );
  }

  @Post(':id/join-requests/:requestId/reject')
  async rejectRequest(
    @Param('id') id: string,
    @Param('requestId') requestId: string,
    @Req() req,
  ) {
    const actorId = req.user.userId;
    return this.conversationsService.handleJoinRequest(
      id,
      requestId,
      actorId,
      'REJECTED',
    );
  }

  @Patch(':id/group-info')
  @UseInterceptors(FileInterceptor('avatar'))
  async updateGroup(
    @Param('id') id: string,
    @Req() req: any,
    @Body() updateDto: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return await this.conversationsService.updateGroupInfo(
      id,
      req.user.userId,
      updateDto,
      file,
    );
  }
}
