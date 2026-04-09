import {
  Body,
  Controller,
  Delete,
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

@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  private readonly MOCK_USER_ID = '69a2a639ac30e2a1231fb454';

  @Post('group')
  //   @UseGuards()
  async createGroup(@Req() req, @Body() createGroupDto: CreateGroupDto) {
    // const userId = req.user?._id;
    const userId = this.MOCK_USER_ID;

    return this.conversationsService.createGroup(userId, createGroupDto);
  }

  @Delete(':id')
  async deleteGroup(@Param('id') id: string, @Req() req) {
    // const userId = req.user?._id;
    const userId = this.MOCK_USER_ID;

    return this.conversationsService.deleteGroup(id, userId);
  }

  @Patch(':id/members/role')
  async updateMembersRole(
    @Param('id') id: string,
    @Req() req,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    // const userId = req.user?._id;
    const userId = this.MOCK_USER_ID;
    return this.conversationsService.updateMembersRole(id, userId, dto);
  }

  @Post(':id/transfer-owner')
  async transferOwner(
    @Param('id') id: string,
    @Req() req,
    @Body() dto: TransferOwnerDto,
  ) {
    // const currentOwnerId = req.user?._id;
    const currentOwnerId = this.MOCK_USER_ID;
    return this.conversationsService.transferOwner(id, currentOwnerId, dto);
  }

  @Delete(':id/remove-member')
  async removeMember(
    @Param('id') id: string,
    @Req() req,
    @Body() dto: RemoveMemberDto,
  ) {
    // const actorId = req.user?._id;
    const actorId = this.MOCK_USER_ID;

    return this.conversationsService.removeMember(id, actorId, dto);
  }

  @Post(':id/add-members')
  async addMembers(
    @Param('id') id: string,
    @Req() req,
    @Body() dto: AddMemberDto,
  ) {
    // const actorId = req.user?._id;
    const actorId = this.MOCK_USER_ID;
    return this.conversationsService.addMember(id, actorId, dto);
  }

  @Get('/user/:userId')
  async getConversationsFromUserId(@Param('userId') userId: string) {
    return this.conversationsService.getConversationsFromUser(userId);
  }
}
