import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { NullToEmpty } from '@app/common/decorators/null-to-empty.decorator';
import { ETag } from '@app/common/decorators/etag.decorator';
import { SensitiveFields } from '@app/common/decorators/sensitive.decorator';
import { PaginationResponse } from '@app/common/decorators/pagination-response.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @PaginationResponse()
  @Get()
  getHello() {
    return { lis1:[], total:200, page:1, pageSize:23 };
    // return this.appService.getHello();
  }
}
