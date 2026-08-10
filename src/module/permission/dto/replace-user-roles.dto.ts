import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class ReplaceUserRolesDto {
  @ApiProperty({ description: '角色 UUID 列表；传空数组表示清空用户业务角色', type: String, isArray: true })
  @IsUUID('4', { each: true })
  @ArrayUnique()
  @IsArray()
  roleIds: string[];
}
