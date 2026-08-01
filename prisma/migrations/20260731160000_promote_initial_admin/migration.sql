-- 兼容引入角色前已存在的初始化用户：将最早创建的用户设为管理员。
UPDATE `user`
SET `role` = 'ADMIN'
ORDER BY `id` ASC
LIMIT 1;
