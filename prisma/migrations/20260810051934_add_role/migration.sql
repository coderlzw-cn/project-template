-- CreateTable
CREATE TABLE `role` (
    `id` VARCHAR(36) NOT NULL,
    `key` VARCHAR(64) NOT NULL,
    `label` TEXT NOT NULL,
    `description` VARCHAR(1024) NOT NULL DEFAULT '',
    `level` INTEGER NOT NULL,
    `parent_id` VARCHAR(36) NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,

    UNIQUE INDEX `role_key_key`(`key`),
    INDEX `role_parent_id_idx`(`parent_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `role` ADD CONSTRAINT `role_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `role`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
