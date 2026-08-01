-- 为表和字段添加 MySQL COMMENT（Prisma 的 /// 注释不会同步到数据库，需手动维护此迁移）
-- 注意：MODIFY COLUMN 必须携带与当前定义完全一致的列定义，仅追加 COMMENT

-- user 表
ALTER TABLE `user` COMMENT = '用户表';
ALTER TABLE `user`
    MODIFY COLUMN `id` INTEGER NOT NULL AUTO_INCREMENT COMMENT '用户ID，自增主键',
    MODIFY COLUMN `username` VARCHAR(191) NOT NULL COMMENT '用户名，全局唯一，用于登录',
    MODIFY COLUMN `password` VARCHAR(191) NOT NULL COMMENT '密码的 bcrypt 哈希值（不存明文）',
    MODIFY COLUMN `email` VARCHAR(191) NULL COMMENT '邮箱，可选，全局唯一',
    MODIFY COLUMN `role` ENUM('ADMIN', 'USER') NOT NULL DEFAULT 'USER' COMMENT '用户角色：ADMIN 管理员 / USER 普通用户',
    MODIFY COLUMN `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
    MODIFY COLUMN `update_time` DATETIME(3) NOT NULL COMMENT '更新时间';

-- auth_session 表
ALTER TABLE `auth_session` COMMENT = '认证会话表，一行代表一次登录产生的会话（refresh token 的生命周期）';
ALTER TABLE `auth_session`
    MODIFY COLUMN `id` VARCHAR(36) NOT NULL COMMENT '会话ID，UUID，同时作为 access token 的 jti 声明',
    MODIFY COLUMN `user_id` INTEGER NOT NULL COMMENT '所属用户ID，用户删除时级联删除会话',
    MODIFY COLUMN `refresh_token_hash` CHAR(64) NOT NULL COMMENT 'refresh token 的 SHA-256 哈希值（不存原始令牌），刷新时轮换',
    MODIFY COLUMN `expires_time` DATETIME(3) NOT NULL COMMENT '会话过期时间，超过后 refresh token 不可用',
    MODIFY COLUMN `revoked_time` DATETIME(3) NULL COMMENT '撤销时间，非空表示会话已注销（注销/改密/超额淘汰），保留一段时间用于审计',
    MODIFY COLUMN `last_used_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '最后使用时间，登录和刷新令牌时更新，用于淘汰最久未使用的会话',
    MODIFY COLUMN `ip_address` VARCHAR(45) NULL COMMENT '登录/刷新时的客户端 IP（已归一化，最长 45 字符兼容 IPv6）',
    MODIFY COLUMN `user_agent` VARCHAR(512) NULL COMMENT '登录/刷新时的客户端 User-Agent，用于展示设备信息',
    MODIFY COLUMN `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
    MODIFY COLUMN `update_time` DATETIME(3) NOT NULL COMMENT '更新时间';
