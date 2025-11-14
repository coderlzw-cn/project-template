import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello() {
    console.log(process.env.NODE_ENV, 'process.env.NODE_ENV');

    return 'Hello World!';
  }
}
