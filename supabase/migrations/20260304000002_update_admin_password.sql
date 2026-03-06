-- Manual update for superadmin password
-- Target user: jmunoz@juancode.dev

CREATE EXTENSION IF NOT EXISTS pgcrypto;

UPDATE auth.users
SET encrypted_password = extensions.crypt('AdminQuiver2024*', extensions.gen_salt('bf')),
    updated_at = now()
WHERE email = 'jmunoz@juancode.dev';

-- Ensure the user is confirmed and has recent recovery info to avoid lockout
UPDATE auth.users
SET email_confirmed_at = now(),
    last_sign_in_at = now()
WHERE email = 'jmunoz@juancode.dev';
