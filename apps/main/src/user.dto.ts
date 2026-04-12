import { PaginationDto } from '@app/common/dto/pagination.dto';
import { IsNotEmpty, IsString } from 'class-validator';

export class UserDto extends PaginationDto {
  /**
   * 姓名
   * @example 1123
   */
  @IsString({ message: 'name must be a string' })
  @IsNotEmpty({ message: 'name is required' })
  name: string;

  @IsString({ message: 'email must be a string' })
  @IsNotEmpty({ message: 'email is required' })
  email: string;
}
