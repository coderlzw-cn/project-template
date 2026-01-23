import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import path from 'path';

describe('UserService', () => {
  let service: UserService;
  let prismaService: PrismaService;
  let module: TestingModule;

  beforeAll(async () => {
    const envFilePath = [path.join(process.cwd(), '.env')];

    module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, envFilePath }), PrismaModule],
      providers: [UserService],
    }).compile();

    service = module.get<UserService>(UserService);
    prismaService = module.get<PrismaService>(PrismaService);
    await prismaService.onModuleInit();
  });

  afterAll(async () => {
    await prismaService.onModuleDestroy();
    await module.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
