INSERT INTO "users" (id, nama, email, password, role, "outletId", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'Owner',
  'owner@gmail.com',
  'owner123',
  'ADMIN',
  (SELECT id FROM "outlets" LIMIT 1),
  NOW(),
  NOW()
);