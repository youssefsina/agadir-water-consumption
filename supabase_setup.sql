-- Create an updated sensor_readings table that captures exactly what the backend API handles
CREATE TABLE IF NOT EXISTS public.sensor_readings (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Core Measurements
    flow_lpm NUMERIC,
    pressure_bar NUMERIC,
    soil_moisture_pct NUMERIC,
    temperature_c NUMERIC,
    rain_probability NUMERIC,
    hour_of_day NUMERIC,
    is_irrigating SMALLINT DEFAULT 0,
    
    -- Calculated Metrics
    flow_rolling_mean NUMERIC,
    flow_rolling_std NUMERIC,
    pressure_rolling_mean NUMERIC,
    pressure_drop NUMERIC,
    flow_deviation NUMERIC,
    soil_delta NUMERIC,
    evap_index NUMERIC,
    
    -- AI Predictions Output Columns
    anomaly_label SMALLINT DEFAULT 0,
    anomaly_type TEXT DEFAULT 'Normal',
    anomaly_confidence NUMERIC DEFAULT 0.0,
    
    -- Device Tracking for IoT mapping
    device_id TEXT
);

-- Index for querying recent ranges optimally
CREATE INDEX IF NOT EXISTS idx_sensor_readings_timestamp ON public.sensor_readings(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_device_id ON public.sensor_readings(device_id);

-- Optional: If you want to log real webhook events independent of sensor readings
CREATE TABLE IF NOT EXISTS public.webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    device_id TEXT NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    payload JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_received ON public.webhook_events(received_at DESC);
