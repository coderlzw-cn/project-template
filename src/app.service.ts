import { Injectable, Logger } from '@nestjs/common';
import { RabbitmqService } from '@app/shared/rabbitmq/rabbitmq.service';
import { MinioService } from '@app/shared/minio/minio.service';
@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  constructor(
    private readonly rabbitmqService: RabbitmqService,
    private readonly minioService: MinioService,
  ) {}

  getHello() {
    // this.rabbitmqService.publish('my_exchanges_test1', 'my_routing_key_test1', { message: 'Hello World!' });
    // this.minioService
    //   .makeBucket('test-bucket')
    //   .then(() => {
    //     console.log('Bucket created');
    //   })
    //   .catch((err) => {
    //     console.log(err);
    //   });
    // this.minioService
    //   .removeBucket('test-bucket')
    //   .then(() => {
    //     console.log('Bucket removed');
    //   })
    //   .catch((err) => {
    //     console.log(err);
    //   });
    // this.minioService
    //   .listBuckets()
    //   .then((buckets) => {
    //     console.log(buckets);
    //   })
    //   .catch((err) => {
    //     console.log(err);
    //   });
    // this.minioService
    //   .upload('test-bucket.txt', 'test-file.txt', {
    //     contentType: 'text/plain',
    //     bucket: 'test-bucket',
    //   })
    //   .then(() => {
    //     console.log('File uploaded');
    //   })
    //   .catch((err) => {
    //     console.log(err);
    //   });
    this.minioService
      .remove('test-bucket.txt', {
        bucket: 'test-bucket',
      })
      .then(() => {
        console.log('File removed');
      })
      .catch((err) => {
        console.log(err);
      });
    return 'Hello World!';
  }
}
