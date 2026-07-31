import { Injectable } from '@nestjs/common';

@Injectable()
export class UserService {
  finAll() {
    return [{ username: 'zhangsan' }];
  }
}
