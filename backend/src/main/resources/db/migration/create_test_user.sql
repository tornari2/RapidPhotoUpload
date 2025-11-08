-- Create a test user for development
-- Username: testuser
-- Password: password123
-- 
-- Run this script in your PostgreSQL database:
-- psql -d rapidphoto -f create_test_user.sql
-- 
-- Or execute directly:
-- psql -d rapidphoto -c "INSERT INTO users (username, password_hash) VALUES ('testuser', '\$2a\$10\$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy') ON CONFLICT (username) DO NOTHING;"

-- Note: The password hash above is for "password123" using BCrypt
-- If you need to generate a new hash, you can use Spring's PasswordEncoder in a test or use an online BCrypt generator

INSERT INTO users (username, password_hash) 
VALUES ('testuser', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy')
ON CONFLICT (username) DO NOTHING;

-- Verify the user was created
SELECT id, username, created_at FROM users WHERE username = 'testuser';

