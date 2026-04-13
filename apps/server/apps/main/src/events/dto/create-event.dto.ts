import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'The name of the event',
    example: 'test',
  })
  name: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'The description of the event',
    example: 'test',
  })
  description: string;
}
