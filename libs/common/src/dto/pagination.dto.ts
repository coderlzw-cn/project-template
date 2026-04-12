import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class PaginationDto {
  @ApiProperty({ description: '当前页码', example: 1 })
  @IsNumber({ allowNaN: false, allowInfinity: false }, { message: '页码必须为数字' })
  @Min(1, { message: '页码必须大于0' })
  @IsInt({ message: '页码必须为整数' })
  @IsOptional()
  page: number = 1;

  @ApiProperty({ description: '每页条数', example: 10 })
  @IsNumber({ allowNaN: false, allowInfinity: false }, { message: '每页条数必须为数字' })
  @Max(500, { message: '每页条数必须小于100' })
  @IsInt({ message: '每页条数必须为整数' })
  @IsOptional()
  pageSize: number = 500;

  @ApiProperty({ description: '偏移量', example: 0 })
  @IsNumber({ allowNaN: false, allowInfinity: false }, { message: '偏移量必须为数字' })
  @IsInt({ message: '偏移量必须为整数' })
  @IsOptional()
  offset: number;
}

export class PaginationVo<T> {
  constructor(values: PaginationVo<T>) {
    Object.assign(this, values);
  }
  @ApiProperty({ description: '列表', type: [Object] })
  list: T[];

  @ApiProperty({ description: '总数', example: 100 })
  total: number;

  @ApiProperty({ description: '当前页码', example: 1 })
  page: number;
}
