-- 1. Create Master Tables
CREATE TABLE IF NOT EXISTS master_roles (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(20) UNIQUE NOT NULL,
    permissions JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS master_sites (
    site_id SERIAL PRIMARY KEY,
    site_name VARCHAR(50) UNIQUE NOT NULL,
    location TEXT,
    pic_name VARCHAR(100),
    pic_phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS master_board_models (
    model_id SERIAL PRIMARY KEY,
    model_name VARCHAR(50) UNIQUE NOT NULL,
    cpu_model VARCHAR(100),
    core_count INT,
    total_memory BIGINT, -- in bytes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Migrate Data
INSERT INTO master_roles (role_name)
SELECT DISTINCT role FROM master_users ON CONFLICT (role_name) DO NOTHING;

INSERT INTO master_sites (site_name)
SELECT DISTINCT site_group FROM mikrotik_boards ON CONFLICT (site_name) DO NOTHING;

INSERT INTO master_board_models (model_name)
SELECT DISTINCT board_model FROM mikrotik_boards WHERE board_model IS NOT NULL ON CONFLICT (model_name) DO NOTHING;

-- 3. Add Foreign Key Columns (Nullable first)
ALTER TABLE master_users ADD COLUMN role_id INT REFERENCES master_roles(role_id);
ALTER TABLE mikrotik_boards ADD COLUMN site_id INT REFERENCES master_sites(site_id);
ALTER TABLE mikrotik_boards ADD COLUMN model_id INT REFERENCES master_board_models(model_id);

-- 4. Update FK Values based on strings
UPDATE master_users u SET role_id = r.role_id FROM master_roles r WHERE u.role = r.role_name;
UPDATE mikrotik_boards b SET site_id = s.site_id FROM master_sites s WHERE b.site_group = s.site_name;
UPDATE mikrotik_boards b SET model_id = m.model_id FROM master_board_models m WHERE b.board_model = m.model_name;

-- 5. Set NOT NULL where applicable
ALTER TABLE master_users ALTER COLUMN role_id SET NOT NULL;
ALTER TABLE mikrotik_boards ALTER COLUMN site_id SET NOT NULL;
