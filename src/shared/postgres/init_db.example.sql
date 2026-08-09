
CREATE TABLE IF NOT EXISTS anomaly_strategies (
    id SERIAL PRIMARY KEY,
    strategy_name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    params JSONB NOT NULL DEFAULT '{}',
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alert_notifications (
    id SERIAL PRIMARY KEY,
    channel_name VARCHAR(100) NOT NULL UNIQUE,
    params JSONB NOT NULL DEFAULT '{}',
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO anomaly_strategies (strategy_name, description, params, is_enabled)
VALUES
('MAD_Strategy', 'Phát hiện bất thường dựa trên Median Absolute Deviation', '{"mad_k": 3.0, "duration_safe_seconds": 12.0}', TRUE),
('Threshold_Strategy', 'Phát hiện bất thường dựa trên ngưỡng cố định Th1/Th2', '{"threshold_1": 0.55, "threshold_2": 0.75, "duration_danger_seconds": 30.0}', TRUE)
ON CONFLICT (strategy_name) DO NOTHING;

INSERT INTO alert_notifications (channel_name, params, is_enabled)
VALUES
('telegram', '{"bot_token": "BOT_TOKEN", "chat_id": "CHAT_ID"}', TRUE),
('webhook', '{"url": "URL", "secret": "SECRET"}', FALSE),
('gmail', '{"smtp_server": "smtp.gmail.com", "port": 587, "sender_email": "SENDER_EMAIL", "password": "PASSWORD"}', FALSE)
ON CONFLICT (channel_name) DO NOTHING;


-- Table to track the latest state of each node and resource for dashboard rendering
CREATE TABLE IF NOT EXISTS node_current_status (
    id SERIAL PRIMARY KEY,
    node_id VARCHAR(255) NOT NULL,
    resource_type VARCHAR(50) NOT NULL, -- 'cpu' or 'ram'
    status_level VARCHAR(50) NOT NULL,  -- 'recovered', 'warning', 'alert'
    last_value NUMERIC(5, 4) NOT NULL,  -- e.g., 0.9523
    scenario VARCHAR(100) NOT NULL,     -- scenario name
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_node_resource UNIQUE (node_id, resource_type)
);

-- Table to store historical log of every sent notification
CREATE TABLE IF NOT EXISTS alert_history (
    id SERIAL PRIMARY KEY,
    node_id VARCHAR(255) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    status_level VARCHAR(50) NOT NULL,  -- 'recovered', 'warning', 'alert'
    metric_value NUMERIC(5, 4) NOT NULL,
    scenario VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);



