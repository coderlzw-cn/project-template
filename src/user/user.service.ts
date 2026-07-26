import { Injectable } from '@nestjs/common';
import { spawn } from 'node:child_process';
import { first, fromEvent, map, of, race, switchMap, tap, timer } from 'rxjs';

@Injectable()
export class UserService {
  finAll() {
    console.log('123123');
    const code = 1;
    const data = code
      ? { message: '用户删除成功' }
      : {
          message: '用户创建成功',
          data: { name: '---', age: 20 },
        };

    return data;
  }
}
