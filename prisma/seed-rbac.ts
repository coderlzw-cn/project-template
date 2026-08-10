import 'dotenv/config';

import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { hash } from 'bcrypt';
import { PrismaClient } from '../src/generated/prisma/client';

const MOCK_USER_COUNT = 500;
const MOCK_USER_PREFIX = 'mock_rbac_';
const MOCK_API_URL = 'https://randomuser.me/api/1.4/?seed=project-template-rbac&results=500&nat=us,gb,au,nz,ca&inc=login,email';
const TEST_PASSWORD = 'Test@123456';

interface RandomUser {
  email: string;
  login: {
    username: string;
  };
}

interface RandomUserResponse {
  error?: string;
  results?: RandomUser[];
}

interface RoleSeed {
  key: string;
  label: string;
  description: string;
  level: number;
  parentKey?: string;
}

const ROLE_SEEDS: RoleSeed[] = [
  { key: 'super_admin', label: '超级管理员', description: '拥有系统全部权限', level: 100 },
  { key: 'platform_admin', label: '平台管理员', description: '负责平台日常管理', level: 90, parentKey: 'super_admin' },
  { key: 'security_admin', label: '安全管理员', description: '负责安全策略与访问控制', level: 88, parentKey: 'super_admin' },
  { key: 'audit_admin', label: '审计管理员', description: '负责审计记录和合规检查', level: 85, parentKey: 'security_admin' },
  { key: 'user_admin', label: '用户管理员', description: '负责用户生命周期管理', level: 82, parentKey: 'platform_admin' },
  { key: 'role_admin', label: '角色管理员', description: '负责角色与授权配置', level: 80, parentKey: 'platform_admin' },
  { key: 'operations_manager', label: '运营经理', description: '管理运营团队与任务', level: 75, parentKey: 'platform_admin' },
  { key: 'custom_ops', label: '定制运维', description: '执行定制化运维任务', level: 72, parentKey: 'operations_manager' },
  { key: 'support_manager', label: '客服经理', description: '管理客户支持团队', level: 68, parentKey: 'operations_manager' },
  { key: 'support_agent', label: '客服专员', description: '处理客户咨询和工单', level: 50, parentKey: 'support_manager' },
  { key: 'finance_manager', label: '财务经理', description: '管理财务数据与流程', level: 70, parentKey: 'platform_admin' },
  { key: 'finance_auditor', label: '财务审计', description: '查看并审计财务数据', level: 58, parentKey: 'finance_manager' },
  { key: 'content_manager', label: '内容经理', description: '管理内容发布流程', level: 65, parentKey: 'platform_admin' },
  { key: 'content_editor', label: '内容编辑', description: '创建和编辑业务内容', level: 45, parentKey: 'content_manager' },
  { key: 'data_manager', label: '数据经理', description: '管理数据资产与权限', level: 66, parentKey: 'platform_admin' },
  { key: 'data_analyst', label: '数据分析师', description: '查询数据并生成分析报告', level: 48, parentKey: 'data_manager' },
  { key: 'project_manager', label: '项目经理', description: '管理项目和成员', level: 60, parentKey: 'platform_admin' },
  { key: 'project_member', label: '项目成员', description: '执行项目任务', level: 35, parentKey: 'project_manager' },
  { key: 'readonly_user', label: '只读用户', description: '仅允许查看已授权数据', level: 10, parentKey: 'platform_admin' },
  { key: 'guest', label: '访客', description: '仅允许访问公开内容', level: 1, parentKey: 'readonly_user' },
];

function getDatabaseConfig() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL 未配置');

  const url = new URL(databaseUrl);
  if (url.protocol !== 'mysql:') throw new Error('DATABASE_URL 必须使用 mysql:// 协议');

  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.slice(1)),
    connectionLimit: 10,
  };
}

async function fetchMockUsers(): Promise<RandomUser[]> {
  const response = await fetch(MOCK_API_URL);
  if (!response.ok) throw new Error(`获取模拟用户失败: HTTP ${response.status}`);

  const payload = (await response.json()) as RandomUserResponse;
  if (payload.error) throw new Error(`获取模拟用户失败: ${payload.error}`);
  if (payload.results?.length !== MOCK_USER_COUNT) {
    throw new Error(`模拟用户数量异常: 期望 ${MOCK_USER_COUNT}，实际 ${payload.results?.length ?? 0}`);
  }

  return payload.results;
}

function normalizeUsername(username: string, index: number): string {
  const safeUsername = username
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .slice(0, 64);
  return `${MOCK_USER_PREFIX}${String(index + 1).padStart(3, '0')}_${safeUsername}`;
}

function normalizeEmail(email: string, index: number): string {
  const localPart =
    email
      .split('@')[0]
      ?.toLowerCase()
      .replace(/[^a-z0-9._-]/g, '') || 'user';
  return `mock.rbac.${String(index + 1).padStart(3, '0')}.${localPart.slice(0, 64)}@example.test`;
}

async function main(): Promise<void> {
  const randomUsers = await fetchMockUsers();
  const passwordHash = await hash(TEST_PASSWORD, 12);
  const prisma = new PrismaClient({ adapter: new PrismaMariaDb(getDatabaseConfig()) });

  try {
    const existingMockUserCount = await prisma.user.count({
      where: { username: { startsWith: MOCK_USER_PREFIX } },
    });
    if (existingMockUserCount > 0) {
      throw new Error(`已存在 ${existingMockUserCount} 个 ${MOCK_USER_PREFIX} 测试用户，为避免重复写入已终止`);
    }

    const result = await prisma.$transaction(
      async (transaction) => {
        const roleIdByKey = new Map<string, string>();

        for (const roleSeed of ROLE_SEEDS) {
          const parentId = roleSeed.parentKey ? roleIdByKey.get(roleSeed.parentKey) : null;
          if (roleSeed.parentKey && !parentId) throw new Error(`找不到父角色: ${roleSeed.parentKey}`);

          const role = await transaction.role.upsert({
            where: { key: roleSeed.key },
            create: {
              key: roleSeed.key,
              label: roleSeed.label,
              description: roleSeed.description,
              level: roleSeed.level,
              parentId,
            },
            update: {
              label: roleSeed.label,
              description: roleSeed.description,
              level: roleSeed.level,
              parentId,
            },
          });
          roleIdByKey.set(role.key, role.id);
        }

        await transaction.user.createMany({
          data: randomUsers.map((user, index) => ({
            username: normalizeUsername(user.login.username, index),
            email: normalizeEmail(user.email, index),
            password: passwordHash,
            role: index < 25 ? 'ADMIN' : 'USER',
          })),
        });

        const users = await transaction.user.findMany({
          where: { username: { startsWith: MOCK_USER_PREFIX } },
          select: { id: true },
          orderBy: { username: 'asc' },
        });
        const roles = await transaction.role.findMany({
          where: { key: { in: ROLE_SEEDS.map((role) => role.key) } },
          select: { id: true },
          orderBy: { level: 'desc' },
        });

        if (users.length !== MOCK_USER_COUNT || roles.length !== ROLE_SEEDS.length) {
          throw new Error(`写入数量校验失败: users=${users.length}, roles=${roles.length}`);
        }

        const assignments = users.flatMap((user, index) => {
          const roleIndexes = new Set([index % roles.length]);
          if (index % 2 === 0) roleIndexes.add((index * 7 + 3) % roles.length);
          if (index % 3 === 0) roleIndexes.add((index * 11 + 5) % roles.length);

          return [...roleIndexes].map((roleIndex) => ({
            userId: user.id,
            roleId: roles[roleIndex]!.id,
          }));
        });

        await transaction.userRoleAssignment.createMany({ data: assignments });

        return {
          users: users.length,
          roles: roles.length,
          assignments: assignments.length,
        };
      },
      { maxWait: 10_000, timeout: 60_000 },
    );

    console.info(JSON.stringify(result));
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
