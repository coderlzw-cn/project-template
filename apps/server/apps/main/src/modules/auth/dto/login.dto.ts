import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  /**
   * 用户名
   * @example admin
   */
  @IsString({ message: 'username must be a string' })
  @IsNotEmpty({ message: 'username is required' })
  username: string;

  /**
   * 密码
   * @example 123456
   */
  @IsString({ message: 'password must be a string' })
  @IsNotEmpty({ message: 'password is required' })
  password: string;
}
