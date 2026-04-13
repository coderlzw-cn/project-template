import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import path from 'path';

describe('UserController', () => {
  let controller: UserController;
  let prismaService: PrismaService;
  let module: TestingModule;

  beforeAll(async () => {
    const envFilePath = [path.join(process.cwd(), '.env')];

    module = await Test.createTestingModule({
      imports: [await ConfigModule.forRoot({ isGlobal: true, envFilePath }), PrismaModule],
      controllers: [UserController],
      providers: [UserService],
    }).compile();

    controller = module.get<UserController>(UserController);
    prismaService = module.get<PrismaService>(PrismaService);
    await prismaService.onModuleInit();
  });

  afterAll(async () => {
    await prismaService.onModuleDestroy();
    await module.close();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should get all users', async () => {
    const users = await controller.getUsers();
    expect(users).toBeDefined();
    expect(Array.isArray(users)).toBe(true);
  });
});
