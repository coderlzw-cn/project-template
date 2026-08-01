-- CreateTable
CREATE TABLE `auth_session` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` INTEGER NOT NULL,
    `refresh_token_hash` CHAR(64) NOT NULL,
    `expires_time` DATETIME(3) NOT NULL,
    `revoked_time` DATETIME(3) NULL,
    `last_used_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ip_address` VARCHAR(45) NULL,
    `user_agent` VARCHAR(512) NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,

    UNIQUE INDEX `auth_session_refresh_token_hash_key`(`refresh_token_hash`),
    INDEX `auth_session_user_id_revoked_time_expires_time_idx`(`user_id`, `revoked_time`, `expires_time`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `auth_session` ADD CONSTRAINT `auth_session_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
