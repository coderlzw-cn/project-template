import { Prisma } from '@/generated/prisma/client';
import { HttpStatus } from '@nestjs/common';
import { isProduction } from '../utils/env';

/** 当前应用需要识别的 Prisma 已知请求错误码。 */
export enum PrismaKnownErrorCode {
  /** 无法连接到指定的数据库服务器。 */
  DatabaseNotReachable = 'P1001',
  /** 数据库服务器可达，但建立连接超时。 */
  DatabaseConnectionTimeout = 'P1002',
  /** 数据库操作执行超时。 */
  OperationTimeout = 'P1008',
  /** 数据库服务器主动关闭了连接。 */
  ServerClosedConnection = 'P1017',
  /** 写入值超过目标字段允许的长度。 */
  ValueTooLong = 'P2000',
  /** 写入数据违反唯一约束。 */
  UniqueConstraintViolation = 'P2002',
  /** 写入或删除数据违反外键约束。 */
  ForeignKeyConstraintViolation = 'P2003',
  /** 必填字段违反非空约束。 */
  NullConstraintViolation = 'P2011',
  /** 字段值超出数据库类型允许的范围。 */
  ValueOutOfRange = 'P2020',
  /** 从数据库连接池获取连接超时。 */
  ConnectionPoolTimeout = 'P2024',
  /** 操作依赖的记录不存在。 */
  RecordNotFound = 'P2025',
  /** 事务发生写冲突或死锁，需要重试。 */
  TransactionWriteConflict = 'P2034',
  /** 数据库连接数已达到上限。 */
  TooManyConnections = 'P2037',
}

/** MariaDB Node.js 驱动内部使用的超时错误码。 */
export enum MariaDbDriverErrorCode {
  ConnectionTimeout = 45012,
  SocketTimeout = 45026,
  GetConnectionTimeout = 45028,
}

const PRISMA_KNOWN_ERROR_CODES = new Set<string>(Object.values(PrismaKnownErrorCode));

/** MariaDB 驱动超时错误码：依次对应建连、socket 响应和连接池获取超时。 */
const DRIVER_TIMEOUT_CODES = [MariaDbDriverErrorCode.ConnectionTimeout, MariaDbDriverErrorCode.SocketTimeout, MariaDbDriverErrorCode.GetConnectionTimeout];

/** Prisma/Driver Adapter 可提供的数据库错误诊断信息，仅供服务端判断和日志使用。 */
export interface DatabaseErrorDetails {
  code: string;
  modelName?: string;
  constraintTargets: readonly string[];
  driverKind?: string;
  originalCode?: string;
  originalMessage?: string;
  database?: string;
  table?: string;
  column?: string;
}

/**
 * 判断异常是否为 Prisma 数据库异常。
 */
export function isDatabaseError(exception: unknown) {
  return (
    // 凭据错误、数据库不存在、TLS 配置错误、启动时不可达
    exception instanceof Prisma.PrismaClientInitializationError ||
    // 唯一约束、外键冲突、记录不存在、连接池超时、事务冲突
    exception instanceof Prisma.PrismaClientKnownRequestError ||
    // 引擎内部缺陷、底层异常
    exception instanceof Prisma.PrismaClientRustPanicError ||
    // 驱动异常、数据库返回了无法识别的错误
    exception instanceof Prisma.PrismaClientUnknownRequestError ||
    // 缺少必填参数、字段名错误、参数类型错误
    exception instanceof Prisma.PrismaClientValidationError
  );
}

/**
 * 判断异常是否为指定错误码的 Prisma 已知请求异常。
 */
export function isDatabaseErrorCode<Code extends PrismaKnownErrorCode>(exception: unknown, code: Code) {
  return exception instanceof Prisma.PrismaClientKnownRequestError && exception.code === code;
}

/**
 * 安全提取 Prisma 已知请求异常的诊断详情。
 */
export function getDatabaseErrorDetails(exception: unknown): DatabaseErrorDetails | null {
  // 仅对 Prisma 已知请求异常提供诊断信息，其他异常返回 null。
  if (!(exception instanceof Prisma.PrismaClientKnownRequestError)) return null;

  const meta = exception.meta;
  const driverAdapterError = typeof meta?.driverAdapterError === 'object' && meta?.driverAdapterError !== null ? (meta?.driverAdapterError as Record<string, unknown>) : null;
  const cause = typeof driverAdapterError?.cause === 'object' && driverAdapterError?.cause !== null ? (driverAdapterError?.cause as Record<string, unknown>) : null;
  const constraint = typeof cause?.constraint === 'object' && cause?.constraint !== null ? (cause?.constraint as Record<string, unknown>) : null;
  const adapterTargets = readConstraintTargets(constraint);
  const legacyTargets = readStringList(meta?.target);

  return {
    code: exception.code,
    modelName: typeof meta?.modelName === 'string' ? meta.modelName : undefined,
    constraintTargets: adapterTargets.length > 0 ? adapterTargets : legacyTargets,
    driverKind: typeof cause?.kind === 'string' ? cause.kind : undefined,
    originalCode: typeof cause?.originalCode === 'string' ? cause.originalCode : undefined,
    originalMessage: typeof cause?.originalMessage === 'string' ? cause.originalMessage : undefined,
    database: typeof cause?.db === 'string' ? cause.db : undefined,
    table: typeof cause?.table === 'string' ? cause.table : undefined,
    column: typeof cause?.column === 'string' ? cause.column : undefined,
  };
}

/**
 * 获取 P2002 唯一约束冲突对应的索引或字段名称。
 */
export function getDatabaseUniqueConflictTarget(exception: unknown): string {
  if (!isDatabaseErrorCode(exception, PrismaKnownErrorCode.UniqueConstraintViolation)) return '';
  return getDatabaseErrorDetails(exception)?.constraintTargets.join(',') ?? '';
}

function readStringList(value: unknown): string[] {
  if (typeof value === 'string') return value.length > 0 ? [value] : [];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
}

function readConstraintTargets(constraint: Record<string, unknown> | null): string[] {
  if (!constraint) return [];

  const fields = readStringList(constraint.fields);
  if (fields.length > 0) return fields;

  // MariaDB 的唯一约束使用 index；其他 Driver Adapter 还可能使用 foreignKey。
  const namedConstraint =
    (typeof constraint.index === 'string' && constraint.index.length > 0 ? constraint.index : undefined) ??
    (typeof constraint.foreignKey === 'string' && constraint.foreignKey.length > 0 ? constraint.foreignKey : undefined);
  return namedConstraint ? [namedConstraint] : [];
}

/**
 * 检测 Prisma 数据库异常，并将其转换为适合对外返回的 HTTP 状态和提示信息。
 *
 * 生产环境会隐藏未明确分类的数据库错误详情，避免泄露 SQL、表结构等敏感信息；
 * 非数据库异常返回 `null`，交由全局异常过滤器继续处理。
 */
export function resolveDatabaseError(exception: unknown): { status: HttpStatus; message: string } | null {
  if (exception instanceof Prisma.PrismaClientKnownRequestError) {
    const errorCode = exception.code as PrismaKnownErrorCode;
    if (!PRISMA_KNOWN_ERROR_CODES.has(errorCode)) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: isProduction ? '数据库操作失败，请稍后重试' : exception.message,
      };
    }

    switch (errorCode) {
      case PrismaKnownErrorCode.UniqueConstraintViolation:
        return { status: HttpStatus.CONFLICT, message: '数据已存在，请勿重复提交' };
      case PrismaKnownErrorCode.ForeignKeyConstraintViolation:
        return { status: HttpStatus.CONFLICT, message: '数据存在关联，操作失败' };
      case PrismaKnownErrorCode.NullConstraintViolation:
        return { status: HttpStatus.BAD_REQUEST, message: '必填数据不能为空' };
      case PrismaKnownErrorCode.ValueTooLong:
        return { status: HttpStatus.BAD_REQUEST, message: '字段内容超过允许的长度' };
      case PrismaKnownErrorCode.ValueOutOfRange:
        return { status: HttpStatus.BAD_REQUEST, message: '字段数值超出允许范围' };
      case PrismaKnownErrorCode.RecordNotFound:
        return { status: HttpStatus.NOT_FOUND, message: '数据不存在或已被删除' };
      case PrismaKnownErrorCode.ConnectionPoolTimeout:
      case PrismaKnownErrorCode.OperationTimeout:
        return { status: HttpStatus.GATEWAY_TIMEOUT, message: '数据库响应超时，请稍后重试' };
      case PrismaKnownErrorCode.DatabaseNotReachable:
      case PrismaKnownErrorCode.DatabaseConnectionTimeout:
      case PrismaKnownErrorCode.ServerClosedConnection:
        return { status: HttpStatus.SERVICE_UNAVAILABLE, message: '数据库连接失败，请稍后重试' };
      case PrismaKnownErrorCode.TransactionWriteConflict:
        return { status: HttpStatus.CONFLICT, message: '数据已被其他请求修改，请重试' };
      case PrismaKnownErrorCode.TooManyConnections:
        return { status: HttpStatus.SERVICE_UNAVAILABLE, message: '数据库繁忙，请稍后重试' };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: isProduction ? '数据库操作失败，请稍后重试' : exception.message,
        };
    }
  }

  if (exception instanceof Prisma.PrismaClientInitializationError) {
    return { status: HttpStatus.SERVICE_UNAVAILABLE, message: '数据库连接失败，请稍后重试' };
  }

  if (exception instanceof Prisma.PrismaClientUnknownRequestError || exception instanceof Prisma.PrismaClientValidationError) {
    // 驱动层超时错误可能被 Prisma 包装为未知错误，因此需要从错误信息中识别驱动错误码。
    if (DRIVER_TIMEOUT_CODES.some((code) => exception.message.includes(String(code)))) {
      return { status: HttpStatus.GATEWAY_TIMEOUT, message: '数据库响应超时，请稍后重试' };
    }
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: isProduction ? '数据库操作失败，请稍后重试' : exception.message,
    };
  }

  return null;
}
