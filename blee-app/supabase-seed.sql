-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  "isActive" BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policy for anon users to bypass RLS (for development)
CREATE POLICY "Enable all operations for anon" ON users
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Insert test accounts with hashed passwords
-- Password: admin123 -> $2a$12$7JKhGvp5YukYmfE3xC.Vv.nYGxRKVXHtPxJKFUqKQHLYGvJYzQm5y
-- Password: editor123 -> $2a$12$QF5BWJrJpmWKhO2DH8Gv0eTpZq2PUXqXV8vLYV0lD17sH.lTxYLzm

INSERT INTO users (email, name, password, role, "isActive") VALUES
('admin@misopin.com', '슈퍼 관리자', '$2a$12$7JKhGvp5YukYmfE3xC.Vv.nYGxRKVXHtPxJKFUqKQHLYGvJYzQm5y', 'SUPER_ADMIN', true),
('manager@misopin.com', '일반 관리자', '$2a$12$7JKhGvp5YukYmfE3xC.Vv.nYGxRKVXHtPxJKFUqKQHLYGvJYzQm5y', 'ADMIN', true),
('editor@misopin.com', '편집자', '$2a$12$QF5BWJrJpmWKhO2DH8Gv0eTpZq2PUXqXV8vLYV0lD17sH.lTxYLzm', 'EDITOR', true)
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  password = EXCLUDED.password,
  role = EXCLUDED.role,
  "isActive" = EXCLUDED."isActive";