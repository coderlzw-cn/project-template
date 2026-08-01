-- AlterTable
ALTER TABLE `user` ADD COLUMN `failed_login_attempts` INTEGER NOT NULL DEFAULT 0 COMMENT '连续登录失败次数，登录成功或触发锁定后清零',
    ADD COLUMN `locked_until` DATETIME(3) NULL COMMENT '锁定截止时间，晚于当前时间表示账户被锁定（连续登录失败触发），到期自动解锁';
