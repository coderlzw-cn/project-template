import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsUUID } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class ReplaceUserRolesDto {
  @ApiProperty({ description: '角色 UUID 列表；传空数组表示清空用户业务角色', type: String, isArray: true })
  @IsUUID('4', { each: true, message: i18nValidationMessage('validation.IS_UUID', { property: '角色 ID' }) })
  @ArrayUnique({ message: i18nValidationMessage('validation.ARRAY_UNIQUE', { property: '角色 ID 列表' }) })
  @IsArray({ message: i18nValidationMessage('validation.IS_ARRAY', { property: '角色 ID 列表' }) })
  roleIds: string[];
}
