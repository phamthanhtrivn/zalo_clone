import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Conversation } from './schemas/conversation.schema';
import { Connection, Model, Types } from 'mongoose';
import { Member } from '../members/schemas/member.schema';
import { CreateGroupDto } from './dto/create-group.dto';
import { Message } from '../messages/schemas/message.schema';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { TransferOwnerDto } from './dto/transfer-owner.dto';
import { RemoveMemberDto } from './dto/remove-member.dto';
import { AddMemberDto } from './dto/add-member.dto';

import e from 'express';
import { User } from '../users/schemas/user.schema';

import { ConversationItemDto } from './dto/conversation-item.dto';
import { StorageService } from 'src/common/storage/storage.service';
import { ConversationType } from 'src/common/types/enums/conversation-type';
import { MemberRole } from 'src/common/types/enums/member-role';
import { ChatGateway } from '../chat/chat.gateway';
import { CallStatus } from 'src/common/types/enums/call-status';
import { MessagesService } from '../messages/messages.service';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectModel(Conversation.name)
    private conversationModel: Model<Conversation>,
    @InjectModel(Member.name) private memberModel: Model<Member>,
    @InjectModel(Message.name) private messageModel: Model<Message>,
    @InjectModel('User') private userModel: Model<User>,

    @InjectConnection() private connection: Connection,
    private readonly storageService: StorageService,
    private readonly chatGateway: ChatGateway,
    @Inject(forwardRef(() => MessagesService))
    private readonly messagesService: MessagesService,
  ) {}

  private async getFormattedConversationForUser(
    conversationId: string,
    userId: string,
  ) {
    const list = await this.getConversationsFromUser(userId);
    return list.find(
      (c) => c.conversationId.toString() === conversationId.toString(),
    );
  }

  async createGroup(creatorId: string, dto: CreateGroupDto) {
    const uniqueMemberIds = [...new Set(dto.memberIds)];
    if (uniqueMemberIds.includes(creatorId)) {
      throw new BadRequestException(
        'Danh sách thành viên không được chứa người tạo',
      );
    }

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      // Tạo Conversation
      const newConversation = new this.conversationModel({
        type: ConversationType.GROUP,
        group: {
          name: dto.name,
          avatarUrl: dto.avatarUrl || '',
          allowMembersInvite: true,
          allowMembersSendMessages: true,
        },
        lastMessageAt: new Date(),
      });

      const savedConversation = await newConversation.save({ session });

      // Tạo thành viên
      const creatorMember = {
        conversationId: savedConversation._id,
        userId: new Types.ObjectId(creatorId),
        role: MemberRole.OWNER,
        joinedAt: new Date(),
      };

      const otherMembers = uniqueMemberIds.map((memberId) => ({
        conversationId: savedConversation._id,
        userId: new Types.ObjectId(memberId),
        role: MemberRole.MEMBER,
        joinedAt: new Date(),
      }));

      const allMembers = [creatorMember, ...otherMembers];
      await this.memberModel.insertMany(allMembers, { session });

      // Tạo tin nhắn hệ thống
      const creatorName = await this.getUserName(creatorId);
      await this.createSystemMessage(
        savedConversation._id.toString(),
        `${creatorName} đã tạo nhóm`,
        session,
      );

      await session.commitTransaction();

      const finalConversation = await this.conversationModel.findById(
        savedConversation._id,
      );

      const conversationId = savedConversation._id.toString();
      const allMemberIds = [creatorId, ...uniqueMemberIds];

      for (const memberId of allMemberIds) {
        const formattedConv = await this.getFormattedConversationForUser(
          conversationId,
          memberId,
        );
        this.chatGateway.server
          .to(memberId)
          .emit('new_conversation', formattedConv);
      }

      return {
        success: true,
        message: 'Tạo nhóm thành công',
        data: {
          conversation: finalConversation,
          totalMembers: allMembers.length,
        },
      };
    } catch (error) {
      await session.abortTransaction();
      console.log(error);

      throw new InternalServerErrorException('Lỗi khi tạo nhóm.');
    } finally {
      await session.endSession();
    }
  }

  async deleteGroup(conversationId: string, userId: string) {
    const convObjectId = new Types.ObjectId(conversationId.trim());
    const userObjectId = new Types.ObjectId(userId.trim());

    const conversation = await this.conversationModel.findById(convObjectId);
    if (!conversation) {
      throw new NotFoundException('Nhóm trò chuyện không tồn tại');
    }

    if (conversation.type !== ConversationType.GROUP) {
      throw new BadRequestException('Chỉ áp dụng cho nhóm chat');
    }

    const owner = await this.memberModel.findOne({
      conversationId: convObjectId,
      userId: userObjectId,
      leftAt: null,
    });

    if (!owner || owner.role !== MemberRole.OWNER) {
      throw new ForbiddenException(
        'Chỉ trưởng nhóm mới có quyền giải tán nhóm',
      );
    }

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const now = new Date();

      await this.memberModel.updateMany(
        { conversationId: convObjectId, leftAt: null },
        { $set: { leftAt: now } },
        { session },
      );

      await this.createSystemMessage(
        conversationId,
        'Trưởng nhóm đã giải tán nhóm này',
        session,
      );

      await session.commitTransaction();

      const convIdStr = convObjectId.toString();

      this.chatGateway.server.to(convIdStr).emit('group_disbanded', {
        conversationId: convIdStr,
      });

      return {
        success: true,
        message: 'Giải tán nhóm thành công (xóa mềm)',
      };
    } catch (error) {
      await session.abortTransaction();
      console.error('Lỗi giải tán nhóm:', error);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async updateMembersRole(
    conversationId: string,
    actorId: string,
    dto: UpdateMemberRoleDto,
  ) {
    const convObjectId = new Types.ObjectId(conversationId.trim());
    const actorObjectId = new Types.ObjectId(actorId.trim());

    const targetIds = dto.memberIds
      .filter((id) => id !== actorId)
      .map((id) => new Types.ObjectId(id.trim()));

    const conversation = await this.conversationModel.findById(convObjectId);
    if (!conversation) {
      throw new NotFoundException('Nhóm trò chuyện không tồn tại');
    }

    if (conversation.type !== ConversationType.GROUP) {
      throw new BadRequestException('Chỉ áp dụng cho nhóm chat');
    }

    const owner = await this.memberModel.findOne({
      conversationId: convObjectId,
      userId: actorObjectId,
      leftAt: null,
    });

    if (!owner || owner.role !== MemberRole.OWNER) {
      throw new ForbiddenException('Chỉ trưởng nhóm mới có quyền phân quyền');
    }

    if (targetIds.length === 0) {
      throw new BadRequestException(
        'Vui lòng chọn thành viên hợp lệ để phân quyền',
      );
    }

    if (dto.newRole === MemberRole.OWNER) {
      throw new BadRequestException(
        'Vui lòng sử dụng tính năng chuyển nhượng trưởng nhóm riêng',
      );
    }

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const result = await this.memberModel.updateMany(
        {
          conversationId: convObjectId,
          userId: { $in: targetIds },
        },
        { $set: { role: dto.newRole } },
        { session },
      );

      if (result.matchedCount === 0) {
        throw new NotFoundException(
          'Không tìm thấy thành viên nào để cập nhật',
        );
      }

      const actorName = await this.getUserName(actorId);
      const roleName =
        dto.newRole === MemberRole.ADMIN ? 'Phó nhóm' : 'Thành viên';

      const systemMsg = await this.createSystemMessage(
        conversationId,
        `${actorName} đã chỉ định ${result.modifiedCount} người làm ${roleName}`,
        session,
      );

      await session.commitTransaction();

      const convIdStr = convObjectId.toString();

      this.chatGateway.server.to(convIdStr).emit('new_message', {
        ...systemMsg.toObject(),
        conversationId: convIdStr,
      });

      this.chatGateway.server.to(convIdStr).emit('new_message_sidebar', {
        conversationId: convIdStr,
        lastMessage: {
          content: systemMsg.content,
          senderName: null,
          type: 'SYSTEM',
          createdAt: systemMsg.createdAt,
        },
      });

      this.chatGateway.server.to(convIdStr).emit('conversation_updated', {
        conversationId: convIdStr,
        type: 'ROLE_UPDATE',
        data: {
          memberIds: dto.memberIds,
          newRole: dto.newRole,
        },
      });
      this.chatGateway.server.to(convIdStr).emit('role_updated', {
        conversationId: convIdStr,
        memberIds: dto.memberIds,
        newRole: dto.newRole,
      });

      return {
        success: true,
        message: `Đã cập nhật quyền cho ${result.modifiedCount} thành viên`,
      };
    } catch (error) {
      await session.abortTransaction();
      console.error('Lỗi phân quyền:', error);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async transferOwner(
    conversationId: string,
    currentOwnerId: string,
    dto: TransferOwnerDto,
  ) {
    const convObjectId = new Types.ObjectId(conversationId.trim());
    const currentOwnerObjectId = new Types.ObjectId(currentOwnerId.trim());
    const targetObjectId = new Types.ObjectId(dto.targetUserId.trim());

    if (currentOwnerId === dto.targetUserId) {
      throw new BadRequestException('Bạn đã là trưởng nhóm rồi');
    }

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const conversation = await this.conversationModel.findById(convObjectId);
      if (!conversation) {
        throw new NotFoundException('Nhóm trò chuyện không tồn tại');
      }

      if (conversation.type !== ConversationType.GROUP) {
        throw new BadRequestException('Chỉ áp dụng cho nhóm chat');
      }

      const currentOwnerMember = await this.memberModel.findOne({
        conversationId: convObjectId,
        userId: currentOwnerObjectId,
        leftAt: null,
      });

      if (!currentOwnerMember || currentOwnerMember.role !== MemberRole.OWNER) {
        throw new ForbiddenException(
          'Chỉ trưởng nhóm mới có quyền chuyển nhượng',
        );
      }

      const targetMember = await this.memberModel.findOne({
        conversationId: convObjectId,
        userId: targetObjectId,
        leftAt: null,
      });

      if (!targetMember) {
        throw new NotFoundException(
          'Thành viên nhận quyền không tồn tại hoặc đã rời nhóm',
        );
      }

      await this.memberModel
        .updateOne(
          { _id: targetMember._id },
          { $set: { role: MemberRole.OWNER } },
        )
        .session(session);

      await this.memberModel
        .updateOne(
          { _id: currentOwnerMember._id },
          { $set: { role: MemberRole.MEMBER } },
        )
        .session(session);

      const oldOwnerName = await this.getUserName(currentOwnerId);
      const newOwnerName = await this.getUserName(dto.targetUserId);

      const systemMsg = await this.createSystemMessage(
        conversationId,
        `${oldOwnerName} đã chuyển quyền Trưởng nhóm cho ${newOwnerName}`,
        session,
      );

      await session.commitTransaction();

      const convIdStr = convObjectId.toString();

      this.chatGateway.server.to(convIdStr).emit('new_message', {
        ...systemMsg.toObject(),
        conversationId: convIdStr,
      });

      const roleUpdatePayload = {
        conversationId: convIdStr,
        memberIds: [currentOwnerId, dto.targetUserId],
        newRoles: {
          [currentOwnerId]: MemberRole.MEMBER,
          [dto.targetUserId]: MemberRole.OWNER,
        },
      };

      this.chatGateway.server
        .to(convIdStr)
        .emit('role_updated', roleUpdatePayload);

      this.chatGateway.server.to(convIdStr).emit('conversation_updated', {
        conversationId: convIdStr,
        type: 'ROLE_UPDATE',
        data: roleUpdatePayload,
      });

      return {
        success: true,
        message: 'Chuyển nhượng trưởng nhóm thành công',
      };
    } catch (error) {
      await session.abortTransaction();
      console.error('Lỗi chuyển nhượng:', error);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async removeMember(
    conversationId: string,
    actorId: string,
    dto: RemoveMemberDto,
  ) {
    const convObjectId = new Types.ObjectId(conversationId.trim());
    const actorObjectId = new Types.ObjectId(actorId.trim());
    const targetObjectId = new Types.ObjectId(dto.targetUserId.trim());

    const conversation = await this.conversationModel.findById(convObjectId);
    if (!conversation) {
      throw new NotFoundException('Nhóm trò chuyện không tồn tại');
    }

    if (conversation.type !== ConversationType.GROUP) {
      throw new BadRequestException('Chỉ áp dụng cho nhóm chat');
    }

    if (actorId === dto.targetUserId) {
      throw new BadRequestException('Vui lòng sử dụng tính năng rời nhóm');
    }

    const actorMember = await this.memberModel.findOne({
      conversationId: conversation._id,
      userId: actorObjectId,
      leftAt: null,
    });

    console.log('Dữ liệu Member tìm thấy:', actorMember);

    if (!actorMember || actorMember.role === MemberRole.MEMBER) {
      throw new ForbiddenException('Bạn không có quyền xóa thành viên');
    }

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const targetMember = await this.memberModel
        .findOne({
          conversationId: conversation._id,
          userId: targetObjectId,
          leftAt: null,
        })
        .session(session);

      if (!targetMember) {
        throw new NotFoundException(
          'Thành viên muốn xóa không tồn tại hoặc đã rời nhóm',
        );
      }

      if (
        actorMember.role === MemberRole.ADMIN &&
        targetMember.role !== MemberRole.MEMBER
      ) {
        throw new ForbiddenException(
          'Nhóm phó chỉ được phép xóa thành viên thường',
        );
      }

      await this.memberModel
        .updateOne({ _id: targetMember._id }, { $set: { leftAt: new Date() } })
        .session(session);

      const actorName = await this.getUserName(actorId);
      const targetName = await this.getUserName(dto.targetUserId);

      const systemMsg = await this.createSystemMessage(
        conversationId,
        `${actorName} đã mời ${targetName} rời khỏi nhóm`,
        session,
      );

      await session.commitTransaction();

      const convIdStr = conversationId.toString();

      this.chatGateway.server.to(convIdStr).emit('new_message', {
        ...systemMsg.toObject(),
        conversationId: convIdStr,
      });

      this.chatGateway.server.to(convIdStr).emit('new_message_sidebar', {
        conversationId: convIdStr,
        lastMessage: {
          content: systemMsg.content,
          senderName: null,
          type: 'SYSTEM',
          createdAt: systemMsg.createdAt,
        },
      });

      this.chatGateway.server
        .to(dto.targetUserId)
        .emit('removed_from_conversation', { conversationId: convIdStr });

      this.chatGateway.server.to(convIdStr).emit('member_removed', {
        conversationId: convIdStr,
        removedUserId: dto.targetUserId,
      });

      return {
        success: true,
        message: 'Đã xóa thành viên khỏi nhóm (xóa mềm)',
        data: { removeUserId: dto.targetUserId },
      };
    } catch (error) {
      await session.abortTransaction();
      throw new InternalServerErrorException('Lỗi khi xóa thành viên');
    } finally {
      await session.endSession();
    }
  }

  async addMember(conversationId: string, actorId: string, dto: AddMemberDto) {
    const convObjectId = new Types.ObjectId(conversationId.trim());
    const actorObjectId = new Types.ObjectId(actorId.trim());

    const uniqueUserIds = [...new Set(dto.userIds.map((id) => id.trim()))];

    const conversation = await this.conversationModel.findById(convObjectId);
    if (!conversation)
      throw new NotFoundException('Nhóm trò chuyện không tồn tại');

    const actorMember = await this.memberModel.findOne({
      conversationId: convObjectId,
      userId: actorObjectId,
      leftAt: null,
    });

    if (!actorMember)
      throw new ForbiddenException('Bạn không phải là thành viên của nhóm này');

    const membersCanInvite = conversation.group?.allowMembersInvite !== false;
    const isManager = [MemberRole.OWNER, MemberRole.ADMIN].includes(
      actorMember.role,
    );
    if (!isManager && !membersCanInvite) {
      throw new ForbiddenException(
        'Chỉ cho phép trưởng nhóm và phó nhóm thêm thành viên',
      );
    }

    const allMemberRecords = await this.memberModel.find({
      conversationId: convObjectId,
      userId: { $in: uniqueUserIds.map((id) => new Types.ObjectId(id)) },
    });

    const activeUserIds = allMemberRecords
      .filter((m) => m.leftAt === null)
      .map((m) => m.userId.toString());

    const removedUserIds = allMemberRecords
      .filter((m) => m.leftAt !== null)
      .map((m) => m.userId.toString());

    const brandNewUserIds = uniqueUserIds.filter(
      (uid) => !allMemberRecords.some((m) => m.userId.toString() === uid),
    );

    const finalAddIds = [...brandNewUserIds, ...removedUserIds];

    if (finalAddIds.length === 0) {
      throw new BadRequestException(
        'Tất cả thành viên này hiện đang ở trong nhóm rồi',
      );
    }

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      if (removedUserIds.length > 0) {
        await this.memberModel.updateMany(
          {
            conversationId: convObjectId,
            userId: { $in: removedUserIds.map((id) => new Types.ObjectId(id)) },
          },
          {
            $set: {
              leftAt: null,
              joinedAt: new Date(),
              role: MemberRole.MEMBER,
            },
          },
          { session },
        );
      }

      if (brandNewUserIds.length > 0) {
        const newMembersData = brandNewUserIds.map((uid) => ({
          conversationId: convObjectId,
          userId: new Types.ObjectId(uid),
          role: MemberRole.MEMBER,
          joinedAt: new Date(),
          unreadCount: 0,
        }));
        await this.memberModel.insertMany(newMembersData, { session });
      }

      const actorName = await this.getUserName(actorId);
      const users = await this.userModel
        .find({ _id: { $in: finalAddIds.map((id) => new Types.ObjectId(id)) } })
        .select('profile.name')
        .limit(3)
        .lean();

      const names = users.map((u) => u.profile?.name).join(', ');
      const suffix =
        finalAddIds.length > 3
          ? ` và ${finalAddIds.length - 3} người khác`
          : '';

      const systemMsg = await this.createSystemMessage(
        conversationId,
        `${actorName} đã thêm ${names}${suffix} vào nhóm`,
        session,
      );

      await session.commitTransaction();

      const convIdStr = convObjectId.toString();

      this.chatGateway.server.to(convIdStr).emit('new_message', {
        ...systemMsg.toObject(),
        conversationId: convIdStr,
      });

      this.chatGateway.server.to(convIdStr).emit('new_message_sidebar', {
        conversationId: convIdStr,
        lastMessage: {
          content: systemMsg.content,
          senderName: null,
          type: 'SYSTEM',
          createdAt: systemMsg.createdAt,
        },
      });

      for (const uid of finalAddIds) {
        const formattedConv = await this.getFormattedConversationForUser(
          convIdStr,
          uid,
        );
        if (formattedConv) {
          this.chatGateway.server
            .to(uid)
            .emit('new_conversation', formattedConv);
        }
      }

      return {
        success: true,
        message: `Đã thêm ${finalAddIds.length} thành viên`,
      };
    } catch (error) {
      await session.abortTransaction();
      console.error('Lỗi thực sự tại addMember:', error);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  private async getUserName(userId: string): Promise<string> {
    const user = await this.userModel
      .findById(userId)
      .select('profile.name')
      .lean();
    return user?.profile?.name || 'Người dùng Zalo';
  }

  private async createSystemMessage(
    conversationId: string,
    content: string,
    session?: any,
  ) {
    const systemMessage = new this.messageModel({
      conversationId: new Types.ObjectId(conversationId),
      senderId: null,
      type: 'SYSTEM',
      content: {
        text: content,
      },
    });

    const savedMessage = await systemMessage.save({ session });

    await this.conversationModel.findByIdAndUpdate(
      conversationId,
      {
        lastMessageId: savedMessage._id,
        lastMessageAt: savedMessage.createdAt,
      },
      {
        session,
      },
    );

    return savedMessage;
  }

  async getConversationsFromUser(userId: string) {
    const userObjectId = new Types.ObjectId(userId);

    const conversations = await this.memberModel.aggregate([
      {
        // 1. Tìm tất cả các nhóm mà User này tham gia và chưa rời khỏi
        $match: {
          userId: userObjectId,
          leftAt: null,
        },
      },
      {
        // 2. Lấy thông tin chi tiết của Hội thoại
        $lookup: {
          from: 'conversations',
          localField: 'conversationId',
          foreignField: '_id',
          as: 'conversation',
        },
      },
      { $unwind: '$conversation' },
      {
        // 3. Lấy tin nhắn cuối cùng
        $lookup: {
          from: 'messages',
          let: {
            convId: '$conversationId',
            lastMsgId: '$conversation.lastMessageId',
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$conversationId', '$$convId'] },
                    {
                      $not: {
                        $in: [userObjectId, { $ifNull: ['$deletedFor', []] }],
                      },
                    },
                  ],
                },
              },
            },
            { $sort: { createdAt: -1 } },
            { $limit: 1 },
          ],
          as: 'lastMessage',
        },
      },
      { $unwind: { path: '$lastMessage', preserveNullAndEmptyArrays: true } },
      {
        // 4. Lấy thông tin người gửi tin nhắn cuối
        $lookup: {
          from: 'users',
          localField: 'lastMessage.senderId',
          foreignField: '_id',
          as: 'lastMessageSender',
        },
      },
      {
        $unwind: {
          path: '$lastMessageSender',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        // 5. Nếu là DIRECT, tìm User "đối phương"
        $lookup: {
          from: 'members',
          let: { convId: '$conversationId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$conversationId', '$$convId'] },
                    { $ne: ['$userId', userObjectId] },
                  ],
                },
              },
            },
            { $limit: 1 },
            {
              $lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                as: 'userInfo',
              },
            },
            { $unwind: '$userInfo' },
          ],
          as: 'otherMemberInfo',
        },
      },
      {
        $unwind: { path: '$otherMemberInfo', preserveNullAndEmptyArrays: true },
      },
      {
        // 6. Project kết quả cuối cùng
        $project: {
          _id: 0,
          conversationId: '$conversation._id',
          type: '$conversation.type',
          unreadCount: { $ifNull: ['$unreadCount', 0] },

          name: {
            $cond: [
              { $eq: ['$conversation.type', ConversationType.GROUP] },
              '$conversation.group.name',
              {
                $ifNull: [
                  '$otherMemberInfo.userInfo.profile.name',
                  'Người dùng Zalo',
                ],
              },
            ],
          },
          avatar: {
            $cond: [
              { $eq: ['$conversation.type', ConversationType.GROUP] },
              '$conversation.group.avatarUrl',
              '$otherMemberInfo.userInfo.profile.avatarUrl',
            ],
          },
          otherMemberId: '$otherMemberInfo.userId',
          lastMessage: {
            _id: '$lastMessage._id',
            senderName: {
              $cond: [
                { $eq: ['$lastMessage.senderId', userObjectId] },
                'Bạn',
                { $ifNull: ['$lastMessageSender.profile.name', ''] },
              ],
            },
            content: '$lastMessage.content',
            recalled: { $ifNull: ['$lastMessage.recalled', false] },
            type: '$lastMessage.type',
          },
          lastMessageAt: '$conversation.lastMessageAt',
        },
      },
      { $sort: { lastMessageAt: -1 } },
    ]);

    return conversations.map((c) => ({
      ...c,
      otherMemberId: c?.otherMemberId?.toString?.() ?? c?.otherMemberId ?? null,
      avatar: c.avatar ? this.storageService.signFileUrl(c.avatar) : null,
    }));
  }

  async getOrCreateDirectConversation(user1Id: string, user2Id: string) {
    if (user1Id === user2Id) {
      throw new BadRequestException('Không thể tạo hội thoại với chính mình');
    }

    const user1ObjectId = new Types.ObjectId(user1Id);
    const user2ObjectId = new Types.ObjectId(user2Id);

    let conversation = await this.conversationModel.findOne({
      type: ConversationType.DIRECT,
      participants: { $all: [user1ObjectId, user2ObjectId] },
    });

    if (conversation) {
      return conversation;
    }

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const newConversation = new this.conversationModel({
        type: ConversationType.DIRECT,
        participants: [user1ObjectId, user2ObjectId],
        lastMessageAt: new Date(),
      });

      const savedConv = await newConversation.save({ session });

      const members = [
        {
          conversationId: savedConv._id,
          userId: user1ObjectId,
          role: MemberRole.MEMBER,
          joinedAt: new Date(),
          unreadCount: 0,
        },
        {
          conversationId: savedConv._id,
          userId: user2ObjectId,
          role: MemberRole.MEMBER,
          joinedAt: new Date(),
          unreadCount: 0,
        },
      ];

      await this.memberModel.insertMany(members, { session });
      await session.commitTransaction();

      const convId = savedConv._id.toString();

      const formattedForPartner = await this.getFormattedConversationForUser(
        convId,
        user2Id,
      );
      this.chatGateway.server
        .to(user2Id)
        .emit('new_conversation', formattedForPartner);

      return savedConv;
    } catch (error) {
      await session.abortTransaction();
      throw new InternalServerErrorException(
        'Lỗi khi tạo cuộc hội thoại trực tiếp',
      );
    } finally {
      await session.endSession();
    }
  }

  async markAsRead(conversationId: string, userId: string) {
    return this.memberModel.updateOne(
      {
        conversationId: new Types.ObjectId(conversationId),
        userId: new Types.ObjectId(userId),
      },
      { $set: { unreadCount: 0 } },
    );
  }

  async getConversationMembers(
    conversationId: string,
    requesterUserId: string,
  ) {
    const conversation = await this.conversationModel.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException('Hội thoại không tồn tại');
    }

    if (conversation.type !== ConversationType.GROUP) {
      return [];
    }

    const requesterMember = await this.memberModel.findOne({
      conversationId: new Types.ObjectId(conversationId),
      userId: new Types.ObjectId(requesterUserId),
      leftAt: null,
    });
    if (!requesterMember) {
      throw new ForbiddenException('Bạn không phải thành viên của nhóm');
    }

    const members = await this.memberModel
      .find({
        conversationId: new Types.ObjectId(conversationId),
        leftAt: null,
      })
      .populate('userId', 'profile.name profile.avatarUrl')
      .lean();

    const roleOrder: Record<string, number> = {
      [MemberRole.OWNER]: 0,
      [MemberRole.ADMIN]: 1,
      [MemberRole.MEMBER]: 2,
    };

    const list = members.map((m) => {
      const u = m.userId as unknown as {
        _id: Types.ObjectId;
        profile?: { name?: string; avatarUrl?: string };
      };
      const avatarRaw = u?.profile?.avatarUrl;
      return {
        userId: u._id.toString(),
        name: u?.profile?.name ?? 'Người dùng',
        avatarUrl: avatarRaw
          ? this.storageService.signFileUrl(avatarRaw)
          : null,
        role: m.role as MemberRole,
      };
    });

    list.sort(
      (a, b) =>
        (roleOrder[a.role] ?? 9) - (roleOrder[b.role] ?? 9) ||
        a.name.localeCompare(b.name),
    );

    return list;
  }

  async leaveGroup(conversationId: string, userId: string) {
    const convObjectId = new Types.ObjectId(conversationId.trim());
    const userObjectId = new Types.ObjectId(userId.trim());

    const member = await this.memberModel.findOne({
      conversationId: convObjectId,
      userId: userObjectId,
      leftAt: null,
    });

    if (!member) {
      throw new NotFoundException(
        'Bạn không phải là thành viên của nhóm này hoặc đã rời nhóm rồi',
      );
    }

    if (member.role === MemberRole.OWNER) {
      const activeMembersCount = await this.memberModel.countDocuments({
        conversationId: convObjectId,
        leftAt: null,
      });

      if (activeMembersCount > 1) {
        throw new BadRequestException(
          'Bạn phải chuyển quyền Trưởng nhóm cho người khác trước khi rời nhóm',
        );
      }
    }

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      await this.memberModel
        .updateOne({ _id: member._id }, { $set: { leftAt: new Date() } })
        .session(session);

      const userName = await this.getUserName(userId);
      const systemMsg = await this.createSystemMessage(
        conversationId,
        `${userName} đã rời khỏi nhóm`,
        session,
      );

      await session.commitTransaction();

      const convIdStr = convObjectId.toString();

      this.chatGateway.server
        .to(userId)
        .emit('removed_from_conversation', { conversationId: convIdStr });

      this.chatGateway.server.to(convIdStr).emit('new_message', {
        ...systemMsg.toObject(),
        conversationId: convIdStr,
      });

      this.chatGateway.server.to(convIdStr).emit('member_removed', {
        conversationId: convIdStr,
        removedUserId: userId,
      });

      return { success: true, message: 'Rời nhóm thành công' };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async updateCallStatus(
    messageId: string,
    status: CallStatus,
    conversationId: string,
  ) {
    const updateFields: any = { 'call.status': status };
    const now = new Date();

    switch (status) {
      case CallStatus.ACCEPTED:
        updateFields['call.startedAt'] = now;
        break;

      case CallStatus.ENDED:
        updateFields['call.endedAt'] = now;
        break;

      case CallStatus.REJECTED:
      case CallStatus.MISSED:
      case CallStatus.BUSY:
        updateFields['call.endedAt'] = now;
        updateFields['call.duration'] = 0;
        break;

      case CallStatus.RINGING:
        break;
    }

    return await this.messageModel.findByIdAndUpdate(
      messageId,
      { $set: updateFields },
      { new: true },
    );
  }
}
