import { ArrayNotEmpty, IsArray, IsEnum, IsString } from 'class-validator';
import { MemberRole } from 'src/common/types/enums/member-role';

export class UpdateMemberRoleDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  memberIds: string[];

  @IsEnum(MemberRole)
  newRole: MemberRole;
}
