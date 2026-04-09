import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Conversation } from './schemas/conversation.schema';
import { Connection, Model, Types } from 'mongoose';
import { Member } from '../members/schemas/member.schema';
import { CreateGroupDto } from './dto/create-group.dto';
import { ConversationType, MemberRole } from '@zalo-clone/shared-types';
import { Message } from '../messages/schemas/message.schema';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { TransferOwnerDto } from './dto/transfer-owner.dto';
import { RemoveMemberDto } from './dto/remove-member.dto';
import { AddMemberDto } from './dto/add-member.dto';
import e from 'express';
import { User } from '../users/schemas/user.schema';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectModel(Conversation.name)
    private conversationModel: Model<Conversation>,
    @InjectModel(Member.name) private memberModel: Model<Member>,
    @InjectModel(Message.name) private messageModel: Model<Message>,
    @InjectModel('User') private userModel: Model<User>,
    @InjectConnection() private connection: Connection,
  ) {}

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
        creatorId,
        session,
      );

      await session.commitTransaction();

      const finalConversation = await this.conversationModel.findById(
        savedConversation._id,
      );

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
    const conversation = await this.conversationModel.findById(conversationId);

    if (!conversation) {
      throw new NotFoundException('Nhóm trò chuyện không tồn tại');
    }

    if (conversation.type !== ConversationType.GROUP) {
      throw new BadRequestException('Chỉ áp dụng cho nhóm chat');
    }

    const owner = await this.memberModel.findOne({
      conversationId: conversation._id,
      userId: userId,
    });

    if (!owner || owner.role !== MemberRole.OWNER) {
      throw new ForbiddenException(
        'Chỉ trưởng nhóm mới có quyền giải tán nhóm',
      );
    }

    try {
      // Xoá tất cả member
      await this.memberModel.deleteMany({ conversationId: conversation._id });
      // Xoá tất cả tin nhắn
      await this.messageModel.deleteMany({ conversationId: conversation._id });
      // Xoá nhóm chat
      await this.conversationModel.findByIdAndDelete(conversationId);

      return {
        success: true,
        message: 'Giải tán nhóm thành công',
      };
    } catch (error) {
      throw new BadRequestException('Lỗi khi giải tán nhóm');
    }
  }

  async updateMembersRole(
    conversationId: string,
    actorId: string,
    dto: UpdateMemberRoleDto,
  ) {
    const conversation = await this.conversationModel.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException('Nhóm trò chuyện không tồn tại');
    }

    if (conversation.type !== ConversationType.GROUP) {
      throw new BadRequestException('Chỉ áp dụng cho nhóm chat');
    }

    const owner = await this.memberModel.findOne({
      conversationId: conversation._id,
      userId: actorId,
    });

    if (!owner || owner.role !== MemberRole.OWNER) {
      throw new ForbiddenException('Chỉ trưởng nhóm mới có quyền phân quyền');
    }

    const targetIds = dto.memberIds.filter((id) => id !== actorId);

    if (targetIds.length === 0) {
      throw new BadRequestException('Vui lòng chọn thành viên để phân quyền');
    }

    if (dto.newRole === MemberRole.OWNER) {
      throw new BadRequestException(
        'Vui lòng chọn chức năng chuyển nhượng nhớm trưởng riêng',
      );
    }

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const result = await this.memberModel.updateMany(
        {
          conversationId: conversation._id,
          userId: { $in: targetIds },
        },
        {
          $set: { role: dto.newRole },
        },
        { session },
      );

      if (result.matchedCount === 0) {
        throw new NotFoundException(
          'Không tìm thấy thành viên nào trong nhóm để cập nhật',
        );
      }

      const actorName = await this.getUserName(actorId);
      const roleName =
        dto.newRole === MemberRole.ADMIN ? 'Phó nhóm' : 'Thành viên';

      await this.createSystemMessage(
        conversationId,
        `${actorName} đã chỉ định ${result.modifiedCount} người làm ${roleName}`,
        actorId,
        session,
      );

      await session.commitTransaction();

      return {
        success: true,
        message: `Đã cập nhật quyền cho ${result.modifiedCount} thành viên`,
        data: {
          updateCount: result.modifiedCount,
          newRole: dto.newRole,
        },
      };
    } catch (error) {
      await session.abortTransaction();
      throw new InternalServerErrorException('Lỗi khi cập nhật quyền.');
    } finally {
      await session.endSession();
    }
  }

  async transferOwner(
    conversationId: string,
    currentOwnerId: string,
    dto: TransferOwnerDto,
  ) {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const conversation =
        await this.conversationModel.findById(conversationId);
      if (!conversation) {
        throw new NotFoundException('Nhóm trò chuyện không tồn tại');
      }

      if (conversation.type !== ConversationType.GROUP) {
        throw new BadRequestException('Chỉ áp dụng cho nhóm chat');
      }

      if (currentOwnerId === dto.targetUserId) {
        throw new BadRequestException('Bạn đã là trưởng nhóm rồi');
      }

      const currentOwnerMember = await this.memberModel.findOne({
        conversationId: conversation._id,
        userId: currentOwnerId,
      });

      if (!currentOwnerMember || currentOwnerMember.role !== MemberRole.OWNER) {
        throw new ForbiddenException(
          'Chỉ trưởng nhóm mới có quyền chuyển nhượng',
        );
      }

      const targetMember = await this.memberModel.findOne({
        conversationId: conversation._id,
        userId: dto.targetUserId,
      });

      if (!targetMember) {
        throw new NotFoundException(
          'Thành viên được chỉ định không tồn tại trong nhóm',
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

      await this.createSystemMessage(
        conversationId,
        `${oldOwnerName} đã chuyển quyền Trưởng nhóm cho ${newOwnerName}`,
        currentOwnerId,
        session,
      );

      await session.commitTransaction();

      return {
        success: true,
        message: 'Chuyển nhượng trưởng nhóm thành công',
        data: {
          newOwnerId: targetMember._id,
          oldOwnerId: currentOwnerMember._id,
        },
      };
    } catch (error) {
      await session.abortTransaction();

      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      console.error('Lỗi chuyển nhượng nhóm trưởng', error);
      throw new InternalServerErrorException(
        'Lỗi hệ thống khi chuyển nhượng quyền',
      );
    } finally {
      await session.endSession();
    }
  }

  async removeMember(
    conversationId: string,
    actorId: string,
    dto: RemoveMemberDto,
  ) {
    const conversation = await this.conversationModel.findById(conversationId);
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
      userId: actorId,
    });

    if (!actorMember) {
      throw new ForbiddenException('Bạn không phải là thành viên của nhóm này');
    }

    if (actorMember.role === MemberRole.MEMBER) {
      throw new ForbiddenException('Bạn không có quyền xoá thành viên');
    }

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const targetMember = await this.memberModel
        .findOne({
          conversationId: conversation._id,
          userId: dto.targetUserId,
        })
        .session(session);

      if (!targetMember) {
        throw new NotFoundException(
          'Thành viên muốn xoá không tồn tại trong nhóm',
        );
      }

      if (
        actorMember.role === MemberRole.ADMIN &&
        targetMember.role !== MemberRole.MEMBER
      ) {
        throw new ForbiddenException(
          'Nhóm phó chỉ được phép xoá thành viên thường',
        );
      }

      await this.memberModel
        .deleteOne({ _id: targetMember._id })
        .session(session);

      const actorName = await this.getUserName(actorId);
      const targetName = await this.getUserName(dto.targetUserId);

      await this.createSystemMessage(
        conversationId,
        `${actorName} đã mời ${targetName} rời khỏi nhóm`,
        actorId,
        session,
      );

      await session.commitTransaction();

      return {
        success: true,
        message: 'Đã xoá thành viên khỏi nhóm',
        data: {
          removeUserId: dto.targetUserId,
        },
      };
    } catch (error) {
      await session.abortTransaction();
      throw new InternalServerErrorException('Lỗi khi xoá thành viên');
    } finally {
      await session.endSession();
    }
  }

  async addMember(conversationId: string, actorId: string, dto: AddMemberDto) {
    const conversation = await this.conversationModel.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException('Nhóm trò chuyện không tồn tại');
    }

    if (conversation.type !== ConversationType.GROUP) {
      throw new BadRequestException('Chỉ áp dụng cho nhóm chat');
    }

    const actorMember = await this.memberModel.findOne({
      conversationId: conversation._id,
      userId: actorId,
    });

    if (!actorMember) {
      throw new ForbiddenException('Bạn không phải là thành viên của nhóm này');
    }

    const isManager = [MemberRole.OWNER, MemberRole.ADMIN].includes(
      actorMember.role,
    );

    if (!isManager && !conversation.group?.allowMembersInvite) {
      throw new ForbiddenException(
        'Chỉ cho phép trưởng nhóm và phó nhóm thêm thành viên',
      );
    }

    const existingMembers = await this.memberModel.find({
      conversationId: conversation._id,
      userId: { $in: dto.userIds },
    });

    const existingUserIds = existingMembers.map((m) => m.userId.toString());

    const newUserIds = dto.userIds.filter(
      (uid) => !existingUserIds.includes(uid),
    );

    if (newUserIds.length === 0) {
      throw new BadRequestException(
        'Tất cả thành viên này đều đã có trong nhóm',
      );
    }

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const newMembersData = newUserIds.map((uid) => ({
        conversationId: conversation._id,
        userId: uid,
        role: MemberRole.MEMBER,
        joinedAt: new Date(),
      }));

      await this.memberModel.insertMany(newMembersData, { session });

      const actorName = await this.getUserName(actorId);
      const users = await this.userModel
        .find({ _id: { $in: newUserIds } })
        .select('profile.name')
        .limit(3)
        .lean();
      const names = users.map((u) => u.profile?.name).join(', ');
      const suffix =
        newUserIds.length > 3 ? ` và ${newUserIds.length - 3} người khác` : '';
      // Tạo tin nhắn hệ thống
      await this.createSystemMessage(
        conversationId,
        `${actorName} đã thêm ${names}${suffix} vào nhóm`,
        actorId,
        session,
      );

      await session.commitTransaction();

      return {
        success: true,
        message: `Đã thêm ${newMembersData.length} thành viên vào nhóm`,
        data: {
          addedUserIds: newUserIds,
          ignoredUserIds: existingUserIds,
        },
      };
    } catch (error) {
      session.abortTransaction();
      throw new InternalServerErrorException('Lỗi khi thêm thành viên');
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
    senderId: string,
    session?: any,
  ) {
    const systemMessage = new this.messageModel({
      conversationId: new Types.ObjectId(conversationId),
      senderId: new Types.ObjectId(senderId),
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
}
