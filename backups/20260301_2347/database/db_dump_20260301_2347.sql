--
-- PostgreSQL database dump
--

\restrict D1EG66gt8BmZwqASHDbbgIwc6DKOyBcJZrrE1XsaVleogZfhSYbscer3TUHNIAp

-- Dumped from database version 15.17 (Debian 15.17-1.pgdg13+1)
-- Dumped by pg_dump version 15.17 (Debian 15.17-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: fungsi_auto_log_status(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fungsi_auto_log_status() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF (OLD.is_online != NEW.is_online) THEN
        INSERT INTO board_events (board_id, event_category, event_level, event_name, event_detail)
        VALUES (
            NEW.board_id, 
            'connection', 
            CASE WHEN NEW.is_online THEN 'info' ELSE 'critical' END,
            CASE WHEN NEW.is_online THEN 'Router Connectivity Changed' ELSE 'Router Offline' END,
            CASE WHEN NEW.is_online THEN 'Router is now Online' ELSE 'Router Ping Timeout' END
        );
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.fungsi_auto_log_status() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


ALTER TABLE public.alembic_version OWNER TO postgres;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    log_id integer NOT NULL,
    user_id uuid,
    action character varying(50) NOT NULL,
    target_resource character varying(100) NOT NULL,
    details jsonb,
    ip_address character varying(45),
    status character varying(20) DEFAULT 'SUCCESS'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: audit_logs_log_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.audit_logs_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.audit_logs_log_id_seq OWNER TO postgres;

--
-- Name: audit_logs_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audit_logs_log_id_seq OWNED BY public.audit_logs.log_id;


--
-- Name: automation_jobs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.automation_jobs (
    job_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    job_type character varying(50) NOT NULL,
    payload jsonb,
    description text,
    status character varying(20) DEFAULT 'pending'::character varying,
    created_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    completed_at timestamp with time zone
);


ALTER TABLE public.automation_jobs OWNER TO postgres;

--
-- Name: automation_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.automation_logs (
    log_id bigint NOT NULL,
    job_id uuid,
    board_id uuid,
    status character varying(20) DEFAULT 'pending'::character varying,
    output text,
    error_message text,
    executed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.automation_logs OWNER TO postgres;

--
-- Name: automation_logs_log_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.automation_logs_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.automation_logs_log_id_seq OWNER TO postgres;

--
-- Name: automation_logs_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.automation_logs_log_id_seq OWNED BY public.automation_logs.log_id;


--
-- Name: board_backups; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.board_backups (
    backup_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    board_id uuid,
    log_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    file_name character varying(255) NOT NULL,
    router_name character varying(100),
    router_model character varying(50),
    file_location text NOT NULL,
    status character varying(20) DEFAULT 'success'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.board_backups OWNER TO postgres;

--
-- Name: board_client_stats; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.board_client_stats (
    stat_id bigint NOT NULL,
    board_id uuid,
    total_hotspot integer DEFAULT 0,
    total_pppoe integer DEFAULT 0,
    total_active integer GENERATED ALWAYS AS ((total_hotspot + total_pppoe)) STORED,
    log_time timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.board_client_stats OWNER TO postgres;

--
-- Name: board_client_stats_stat_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.board_client_stats_stat_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.board_client_stats_stat_id_seq OWNER TO postgres;

--
-- Name: board_client_stats_stat_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.board_client_stats_stat_id_seq OWNED BY public.board_client_stats.stat_id;


--
-- Name: board_credentials; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.board_credentials (
    cred_id integer NOT NULL,
    board_id uuid,
    username_mikrotik character varying(50) NOT NULL,
    password_mikrotik_encrypted text NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.board_credentials OWNER TO postgres;

--
-- Name: board_credentials_cred_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.board_credentials_cred_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.board_credentials_cred_id_seq OWNER TO postgres;

--
-- Name: board_credentials_cred_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.board_credentials_cred_id_seq OWNED BY public.board_credentials.cred_id;


--
-- Name: board_daily_summary; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.board_daily_summary (
    summary_id integer NOT NULL,
    board_id uuid,
    avg_download numeric(10,2),
    max_download numeric(10,2),
    total_download_bytes bigint DEFAULT 0,
    avg_upload numeric(10,2),
    max_upload numeric(10,2),
    total_upload_bytes bigint DEFAULT 0,
    avg_cpu_load integer DEFAULT 0,
    max_cpu_load integer DEFAULT 0,
    min_free_memory bigint DEFAULT 0,
    avg_hotspot_users integer DEFAULT 0,
    max_hotspot_users integer DEFAULT 0,
    avg_pppoe_users integer DEFAULT 0,
    max_pppoe_users integer DEFAULT 0,
    log_date date NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.board_daily_summary OWNER TO postgres;

--
-- Name: board_daily_summary_summary_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.board_daily_summary_summary_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.board_daily_summary_summary_id_seq OWNER TO postgres;

--
-- Name: board_daily_summary_summary_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.board_daily_summary_summary_id_seq OWNED BY public.board_daily_summary.summary_id;


--
-- Name: board_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.board_events (
    event_id bigint NOT NULL,
    board_id uuid,
    event_category character varying(20),
    event_level character varying(10),
    event_name text NOT NULL,
    event_detail text,
    performed_by uuid,
    is_reset_event boolean DEFAULT false,
    log_time timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.board_events OWNER TO postgres;

--
-- Name: board_events_event_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.board_events_event_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.board_events_event_id_seq OWNER TO postgres;

--
-- Name: board_events_event_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.board_events_event_id_seq OWNED BY public.board_events.event_id;


--
-- Name: board_interface_configs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.board_interface_configs (
    config_id integer NOT NULL,
    board_id uuid,
    interface_name character varying(100) NOT NULL,
    interface_label character varying(100),
    is_active boolean DEFAULT true,
    is_primary_uplink boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.board_interface_configs OWNER TO postgres;

--
-- Name: board_interface_configs_config_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.board_interface_configs_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.board_interface_configs_config_id_seq OWNER TO postgres;

--
-- Name: board_interface_configs_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.board_interface_configs_config_id_seq OWNED BY public.board_interface_configs.config_id;


--
-- Name: board_interface_usage; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.board_interface_usage (
    usage_id bigint NOT NULL,
    board_id uuid,
    interface_name character varying(100) NOT NULL,
    total_tx_bytes bigint DEFAULT 0,
    total_rx_bytes bigint DEFAULT 0,
    log_date date DEFAULT CURRENT_DATE,
    last_update timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.board_interface_usage OWNER TO postgres;

--
-- Name: board_interface_usage_usage_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.board_interface_usage_usage_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.board_interface_usage_usage_id_seq OWNER TO postgres;

--
-- Name: board_interface_usage_usage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.board_interface_usage_usage_id_seq OWNED BY public.board_interface_usage.usage_id;


--
-- Name: board_monthly_summary; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.board_monthly_summary (
    summary_id integer NOT NULL,
    board_id uuid,
    avg_download bigint DEFAULT 0,
    max_download bigint DEFAULT 0,
    total_download_bytes bigint DEFAULT 0,
    avg_upload bigint DEFAULT 0,
    max_upload bigint DEFAULT 0,
    total_upload_bytes bigint DEFAULT 0,
    avg_cpu_load integer DEFAULT 0,
    max_cpu_load integer DEFAULT 0,
    avg_hotspot_users integer DEFAULT 0,
    max_hotspot_users integer DEFAULT 0,
    log_month date NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.board_monthly_summary OWNER TO postgres;

--
-- Name: board_monthly_summary_summary_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.board_monthly_summary_summary_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.board_monthly_summary_summary_id_seq OWNER TO postgres;

--
-- Name: board_monthly_summary_summary_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.board_monthly_summary_summary_id_seq OWNED BY public.board_monthly_summary.summary_id;


--
-- Name: board_pppoe_usage; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.board_pppoe_usage (
    usage_id bigint NOT NULL,
    board_id uuid,
    pppoe_username character varying(100) NOT NULL,
    upload_bytes bigint DEFAULT 0,
    download_bytes bigint DEFAULT 0,
    log_date date DEFAULT CURRENT_DATE,
    last_update timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.board_pppoe_usage OWNER TO postgres;

--
-- Name: board_pppoe_usage_usage_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.board_pppoe_usage_usage_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.board_pppoe_usage_usage_id_seq OWNER TO postgres;

--
-- Name: board_pppoe_usage_usage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.board_pppoe_usage_usage_id_seq OWNED BY public.board_pppoe_usage.usage_id;


--
-- Name: board_resource_stats; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.board_resource_stats (
    resource_id bigint NOT NULL,
    board_id uuid,
    cpu_load integer,
    free_memory bigint,
    free_hdd bigint,
    uptime interval,
    log_time timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.board_resource_stats OWNER TO postgres;

--
-- Name: board_resource_stats_resource_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.board_resource_stats_resource_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.board_resource_stats_resource_id_seq OWNER TO postgres;

--
-- Name: board_resource_stats_resource_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.board_resource_stats_resource_id_seq OWNED BY public.board_resource_stats.resource_id;


--
-- Name: board_speed_stats; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.board_speed_stats (
    speed_id bigint NOT NULL,
    board_id uuid,
    interface_name character varying(100) NOT NULL,
    download_mbps numeric(10,2) DEFAULT 0,
    upload_mbps numeric(10,2) DEFAULT 0,
    log_time timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.board_speed_stats OWNER TO postgres;

--
-- Name: board_speed_stats_speed_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.board_speed_stats_speed_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.board_speed_stats_speed_id_seq OWNER TO postgres;

--
-- Name: board_speed_stats_speed_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.board_speed_stats_speed_id_seq OWNED BY public.board_speed_stats.speed_id;


--
-- Name: hotspot_usage_monthly; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.hotspot_usage_monthly (
    summary_id integer NOT NULL,
    username character varying(100) NOT NULL,
    total_download bigint DEFAULT 0,
    total_upload bigint DEFAULT 0,
    total_uptime bigint DEFAULT 0,
    frequency_days integer,
    month_period date NOT NULL,
    is_frequent_user boolean DEFAULT false,
    last_updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.hotspot_usage_monthly OWNER TO postgres;

--
-- Name: hotspot_usage_monthly_summary_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.hotspot_usage_monthly_summary_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.hotspot_usage_monthly_summary_id_seq OWNER TO postgres;

--
-- Name: hotspot_usage_monthly_summary_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.hotspot_usage_monthly_summary_id_seq OWNED BY public.hotspot_usage_monthly.summary_id;


--
-- Name: hotspot_usage_raw; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.hotspot_usage_raw (
    raw_id bigint NOT NULL,
    board_id uuid,
    username character varying(100) NOT NULL,
    daily_download bigint DEFAULT 0,
    daily_upload bigint DEFAULT 0,
    daily_uptime bigint DEFAULT 0,
    log_date date DEFAULT CURRENT_DATE
);


ALTER TABLE public.hotspot_usage_raw OWNER TO postgres;

--
-- Name: hotspot_usage_raw_raw_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.hotspot_usage_raw_raw_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.hotspot_usage_raw_raw_id_seq OWNER TO postgres;

--
-- Name: hotspot_usage_raw_raw_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.hotspot_usage_raw_raw_id_seq OWNED BY public.hotspot_usage_raw.raw_id;


--
-- Name: master_users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.master_users (
    user_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    username character varying(50) NOT NULL,
    password_hash text NOT NULL,
    full_name character varying(100),
    role character varying(20) DEFAULT 'teknisi'::character varying,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.master_users OWNER TO postgres;

--
-- Name: mikrotik_boards; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mikrotik_boards (
    board_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    board_name character varying(100) NOT NULL,
    mikrotik_identity character varying(100),
    board_model character varying(50),
    site_group character varying(50) DEFAULT 'Umum'::character varying,
    mac_address macaddr NOT NULL,
    ip_address inet NOT NULL,
    port_ssh integer DEFAULT 22,
    port_api integer DEFAULT 8728,
    port_winbox integer DEFAULT 8291,
    port_ftp integer DEFAULT 21,
    is_online boolean DEFAULT false,
    is_monitor boolean DEFAULT true,
    is_public_review boolean DEFAULT true,
    is_maintenance boolean DEFAULT false,
    last_ping_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.mikrotik_boards OWNER TO postgres;

--
-- Name: telegram_bots; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.telegram_bots (
    bot_id integer NOT NULL,
    bot_name character varying(100) NOT NULL,
    bot_token text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.telegram_bots OWNER TO postgres;

--
-- Name: telegram_bots_bot_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.telegram_bots_bot_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.telegram_bots_bot_id_seq OWNER TO postgres;

--
-- Name: telegram_bots_bot_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.telegram_bots_bot_id_seq OWNED BY public.telegram_bots.bot_id;


--
-- Name: telegram_recipients; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.telegram_recipients (
    recipient_id integer NOT NULL,
    user_id uuid,
    bot_id integer,
    board_id uuid,
    chat_id bigint NOT NULL,
    alert_levels text[] DEFAULT '{critical}'::text[],
    is_active boolean DEFAULT true
);


ALTER TABLE public.telegram_recipients OWNER TO postgres;

--
-- Name: telegram_recipients_recipient_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.telegram_recipients_recipient_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.telegram_recipients_recipient_id_seq OWNER TO postgres;

--
-- Name: telegram_recipients_recipient_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.telegram_recipients_recipient_id_seq OWNED BY public.telegram_recipients.recipient_id;


--
-- Name: user_board_access; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_board_access (
    access_id integer NOT NULL,
    user_id uuid,
    board_id uuid,
    granted_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_board_access OWNER TO postgres;

--
-- Name: user_board_access_access_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_board_access_access_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.user_board_access_access_id_seq OWNER TO postgres;

--
-- Name: user_board_access_access_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_board_access_access_id_seq OWNED BY public.user_board_access.access_id;


--
-- Name: vpn_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vpn_profiles (
    vpn_id integer NOT NULL,
    board_id uuid,
    vpn_type character varying(20) DEFAULT 'L2TP/IPSEC'::character varying,
    vpn_api character varying(255),
    vpn_username character varying(50),
    vpn_password_encrypted text,
    vpn_ssh character varying(255),
    vpn_ftp character varying(255),
    vpn_winbox character varying(255),
    is_connected boolean DEFAULT false,
    last_connected_at timestamp with time zone
);


ALTER TABLE public.vpn_profiles OWNER TO postgres;

--
-- Name: vpn_profiles_vpn_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.vpn_profiles_vpn_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.vpn_profiles_vpn_id_seq OWNER TO postgres;

--
-- Name: vpn_profiles_vpn_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.vpn_profiles_vpn_id_seq OWNED BY public.vpn_profiles.vpn_id;


--
-- Name: ztp_queue; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ztp_queue (
    ztp_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    mac_address macaddr NOT NULL,
    ip_address inet NOT NULL,
    identity character varying(100),
    model character varying(50),
    router_version character varying(50),
    temp_username character varying(50),
    temp_password text,
    status character varying(20) DEFAULT 'pending'::character varying,
    requested_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    processed_at timestamp with time zone,
    processed_by uuid
);


ALTER TABLE public.ztp_queue OWNER TO postgres;

--
-- Name: audit_logs log_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN log_id SET DEFAULT nextval('public.audit_logs_log_id_seq'::regclass);


--
-- Name: automation_logs log_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.automation_logs ALTER COLUMN log_id SET DEFAULT nextval('public.automation_logs_log_id_seq'::regclass);


--
-- Name: board_client_stats stat_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.board_client_stats ALTER COLUMN stat_id SET DEFAULT nextval('public.board_client_stats_stat_id_seq'::regclass);


--
-- Name: board_credentials cred_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.board_credentials ALTER COLUMN cred_id SET DEFAULT nextval('public.board_credentials_cred_id_seq'::regclass);


--
-- Name: board_daily_summary summary_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.board_daily_summary ALTER COLUMN summary_id SET DEFAULT nextval('public.board_daily_summary_summary_id_seq'::regclass);


--
-- Name: board_events event_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.board_events ALTER COLUMN event_id SET DEFAULT nextval('public.board_events_event_id_seq'::regclass);


--
-- Name: board_interface_configs config_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.board_interface_configs ALTER COLUMN config_id SET DEFAULT nextval('public.board_interface_configs_config_id_seq'::regclass);


--
-- Name: board_interface_usage usage_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.board_interface_usage ALTER COLUMN usage_id SET DEFAULT nextval('public.board_interface_usage_usage_id_seq'::regclass);


--
-- Name: board_monthly_summary summary_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.board_monthly_summary ALTER COLUMN summary_id SET DEFAULT nextval('public.board_monthly_summary_summary_id_seq'::regclass);


--
-- Name: board_pppoe_usage usage_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.board_pppoe_usage ALTER COLUMN usage_id SET DEFAULT nextval('public.board_pppoe_usage_usage_id_seq'::regclass);


--
-- Name: board_resource_stats resource_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.board_resource_stats ALTER COLUMN resource_id SET DEFAULT nextval('public.board_resource_stats_resource_id_seq'::regclass);


--
-- Name: board_speed_stats speed_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.board_speed_stats ALTER COLUMN speed_id SET DEFAULT nextval('public.board_speed_stats_speed_id_seq'::regclass);


--
-- Name: hotspot_usage_monthly summary_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hotspot_usage_monthly ALTER COLUMN summary_id SET DEFAULT nextval('public.hotspot_usage_monthly_summary_id_seq'::regclass);


--
-- Name: hotspot_usage_raw raw_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hotspot_usage_raw ALTER COLUMN raw_id SET DEFAULT nextval('public.hotspot_usage_raw_raw_id_seq'::regclass);


--
-- Name: telegram_bots bot_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.telegram_bots ALTER COLUMN bot_id SET DEFAULT nextval('public.telegram_bots_bot_id_seq'::regclass);


--
-- Name: telegram_recipients recipient_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.telegram_recipients ALTER COLUMN recipient_id SET DEFAULT nextval('public.telegram_recipients_recipient_id_seq'::regclass);


--
-- Name: user_board_access access_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_board_access ALTER COLUMN access_id SET DEFAULT nextval('public.user_board_access_access_id_seq'::regclass);


--
-- Name: vpn_profiles vpn_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vpn_profiles ALTER COLUMN vpn_id SET DEFAULT nextval('public.vpn_profiles_vpn_id_seq'::regclass);


--
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.alembic_version (version_num) FROM stdin;
7d5ef2a1b93c
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_logs (log_id, user_id, action, target_resource, details, ip_address, status, created_at) FROM stdin;
1	97a5e7d9-2c17-4f10-9fa2-4aeb9dad1615	LOGIN	System	{"username": "developer"}	172.18.0.5	SUCCESS	2026-03-01 14:08:23.594808+00
2	97a5e7d9-2c17-4f10-9fa2-4aeb9dad1615	LOGIN	System	{"username": "developer"}	172.18.0.1	SUCCESS	2026-03-01 14:53:09.208233+00
3	97a5e7d9-2c17-4f10-9fa2-4aeb9dad1615	CREATE_VPN	VPN: vpnuser on Board E2E Test Router	{"vpn_api": "192.168.88.1", "vpn_ftp": null, "vpn_ssh": null, "vpn_type": "L2TP/IPSEC", "vpn_winbox": null, "vpn_password": "vpnpassword", "vpn_username": "vpnuser"}	\N	SUCCESS	2026-03-01 14:53:09.258537+00
4	97a5e7d9-2c17-4f10-9fa2-4aeb9dad1615	DELETE_BOARD	Board: E2E Test Router (192.168.88.1)	null	\N	SUCCESS	2026-03-01 14:53:09.349692+00
5	97a5e7d9-2c17-4f10-9fa2-4aeb9dad1615	LOGIN	System	{"username": "developer"}	172.18.0.1	SUCCESS	2026-03-01 15:02:50.381201+00
6	97a5e7d9-2c17-4f10-9fa2-4aeb9dad1615	CREATE_VPN	VPN: vpnuser on Board E2E Test Router	{"vpn_api": "192.168.88.1", "vpn_ftp": null, "vpn_ssh": null, "vpn_type": "L2TP/IPSEC", "vpn_winbox": null, "vpn_password": "vpnpassword", "vpn_username": "vpnuser"}	\N	SUCCESS	2026-03-01 15:02:50.426538+00
7	97a5e7d9-2c17-4f10-9fa2-4aeb9dad1615	DELETE_BOARD	Board: E2E Test Router (192.168.88.1)	null	\N	SUCCESS	2026-03-01 15:02:50.518218+00
\.


--
-- Data for Name: automation_jobs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.automation_jobs (job_id, job_type, payload, description, status, created_by, created_at, completed_at) FROM stdin;
1ab73002-2fa5-4f3b-a724-ed1092707334	mass_config	{"command": "/system identity set name=TestRouter", "target_ids": ["c34995e4-0060-49de-bdf6-d4f16d7234ae"]}	E2E Test Config	completed	97a5e7d9-2c17-4f10-9fa2-4aeb9dad1615	2026-03-01 14:53:09.273605+00	2026-03-01 14:53:09.280594+00
7e3d16c1-98f1-4ef7-b0b8-051f28f9de61	mass_config	{"command": "/system identity set name=TestRouter", "target_ids": ["fb227575-4295-4cb6-b7f0-1dbbecf3b33b"]}	E2E Test Config	completed	97a5e7d9-2c17-4f10-9fa2-4aeb9dad1615	2026-03-01 15:02:50.441218+00	2026-03-01 15:02:50.447079+00
\.


--
-- Data for Name: automation_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.automation_logs (log_id, job_id, board_id, status, output, error_message, executed_at) FROM stdin;
\.


--
-- Data for Name: board_backups; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.board_backups (backup_id, board_id, log_date, file_name, router_name, router_model, file_location, status, created_at) FROM stdin;
\.


--
-- Data for Name: board_client_stats; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.board_client_stats (stat_id, board_id, total_hotspot, total_pppoe, log_time) FROM stdin;
\.


--
-- Data for Name: board_credentials; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.board_credentials (cred_id, board_id, username_mikrotik, password_mikrotik_encrypted, updated_at) FROM stdin;
1	065f24f4-b87b-42f4-948a-dfe6a1486c49	admin	gAAAAABppEh1RErk7U2kCaRCforc4bKL9dSCc6--GnZ7dpO8y4RaQpQa_Ohet0GBPuy7gw-3juQPg3fFaqPbiPP8Gsj88HND6g==	2026-03-01 14:08:53.072084+00
\.


--
-- Data for Name: board_daily_summary; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.board_daily_summary (summary_id, board_id, avg_download, max_download, total_download_bytes, avg_upload, max_upload, total_upload_bytes, avg_cpu_load, max_cpu_load, min_free_memory, avg_hotspot_users, max_hotspot_users, avg_pppoe_users, max_pppoe_users, log_date, created_at) FROM stdin;
\.


--
-- Data for Name: board_events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.board_events (event_id, board_id, event_category, event_level, event_name, event_detail, performed_by, is_reset_event, log_time) FROM stdin;
\.


--
-- Data for Name: board_interface_configs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.board_interface_configs (config_id, board_id, interface_name, interface_label, is_active, is_primary_uplink, created_at) FROM stdin;
\.


--
-- Data for Name: board_interface_usage; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.board_interface_usage (usage_id, board_id, interface_name, total_tx_bytes, total_rx_bytes, log_date, last_update) FROM stdin;
\.


--
-- Data for Name: board_monthly_summary; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.board_monthly_summary (summary_id, board_id, avg_download, max_download, total_download_bytes, avg_upload, max_upload, total_upload_bytes, avg_cpu_load, max_cpu_load, avg_hotspot_users, max_hotspot_users, log_month, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: board_pppoe_usage; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.board_pppoe_usage (usage_id, board_id, pppoe_username, upload_bytes, download_bytes, log_date, last_update) FROM stdin;
\.


--
-- Data for Name: board_resource_stats; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.board_resource_stats (resource_id, board_id, cpu_load, free_memory, free_hdd, uptime, log_time) FROM stdin;
\.


--
-- Data for Name: board_speed_stats; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.board_speed_stats (speed_id, board_id, interface_name, download_mbps, upload_mbps, log_time) FROM stdin;
\.


--
-- Data for Name: hotspot_usage_monthly; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.hotspot_usage_monthly (summary_id, username, total_download, total_upload, total_uptime, frequency_days, month_period, is_frequent_user, last_updated) FROM stdin;
\.


--
-- Data for Name: hotspot_usage_raw; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.hotspot_usage_raw (raw_id, board_id, username, daily_download, daily_upload, daily_uptime, log_date) FROM stdin;
\.


--
-- Data for Name: master_users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.master_users (user_id, username, password_hash, full_name, role, is_active, created_at) FROM stdin;
97a5e7d9-2c17-4f10-9fa2-4aeb9dad1615	developer	$argon2id$v=19$m=65536,t=3,p=4$4mInmkwRF2EyuWlcw5k6yg$66mGDssnS+p5YG+ON+JtQDOern5ndn+JPS1yVHZC3ws	Developer Admin	admin	t	2026-03-01 14:07:58.489097+00
\.


--
-- Data for Name: mikrotik_boards; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.mikrotik_boards (board_id, board_name, mikrotik_identity, board_model, site_group, mac_address, ip_address, port_ssh, port_api, port_winbox, port_ftp, is_online, is_monitor, is_public_review, is_maintenance, last_ping_at, created_at, updated_at) FROM stdin;
065f24f4-b87b-42f4-948a-dfe6a1486c49	rb750	\N	\N	Umum	00:00:08:00:a0:01	10.10.10.1	22	8899	8291	21	f	t	t	f	\N	2026-03-01 14:08:53.060643+00	2026-03-01 14:08:53.060643+00
\.


--
-- Data for Name: telegram_bots; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.telegram_bots (bot_id, bot_name, bot_token, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: telegram_recipients; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.telegram_recipients (recipient_id, user_id, bot_id, board_id, chat_id, alert_levels, is_active) FROM stdin;
\.


--
-- Data for Name: user_board_access; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_board_access (access_id, user_id, board_id, granted_at) FROM stdin;
\.


--
-- Data for Name: vpn_profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.vpn_profiles (vpn_id, board_id, vpn_type, vpn_api, vpn_username, vpn_password_encrypted, vpn_ssh, vpn_ftp, vpn_winbox, is_connected, last_connected_at) FROM stdin;
\.


--
-- Data for Name: ztp_queue; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ztp_queue (ztp_id, mac_address, ip_address, identity, model, router_version, temp_username, temp_password, status, requested_at, processed_at, processed_by) FROM stdin;
\.


--
-- Name: audit_logs_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.audit_logs_log_id_seq', 7, true);


--
-- Name: automation_logs_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.automation_logs_log_id_seq', 2, true);


--
-- Name: board_client_stats_stat_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.board_client_stats_stat_id_seq', 2, true);


--
-- Name: board_credentials_cred_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.board_credentials_cred_id_seq', 3, true);


--
-- Name: board_daily_summary_summary_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.board_daily_summary_summary_id_seq', 1, false);


--
-- Name: board_events_event_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.board_events_event_id_seq', 1, false);


--
-- Name: board_interface_configs_config_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.board_interface_configs_config_id_seq', 1, false);


--
-- Name: board_interface_usage_usage_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.board_interface_usage_usage_id_seq', 8, true);


--
-- Name: board_monthly_summary_summary_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.board_monthly_summary_summary_id_seq', 1, false);


--
-- Name: board_pppoe_usage_usage_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.board_pppoe_usage_usage_id_seq', 1, false);


--
-- Name: board_resource_stats_resource_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.board_resource_stats_resource_id_seq', 1, false);


--
-- Name: board_speed_stats_speed_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.board_speed_stats_speed_id_seq', 1, false);


--
-- Name: hotspot_usage_monthly_summary_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.hotspot_usage_monthly_summary_id_seq', 1, false);


--
-- Name: hotspot_usage_raw_raw_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.hotspot_usage_raw_raw_id_seq', 1, false);


--
-- Name: telegram_bots_bot_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.telegram_bots_bot_id_seq', 1, false);


--
-- Name: telegram_recipients_recipient_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.telegram_recipients_recipient_id_seq', 1, false);


--
-- Name: user_board_access_access_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_board_access_access_id_seq', 1, false);


--
-- Name: vpn_profiles_vpn_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.vpn_profiles_vpn_id_seq', 2, true);


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (log_id);


--
-- Name: automation_jobs automation_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.automation_jobs
    ADD CONSTRAINT automation_jobs_pkey PRIMARY KEY (job_id);


--
-- Name: automation_logs automation_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.automation_logs
    ADD CONSTRAINT automation_logs_pkey PRIMARY KEY (log_id);


--
-- Name: board_backups board_backups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.board_backups
    ADD CONSTRAINT board_backups_pkey PRIMARY KEY (backup_id);


--
-- Name: board_client_stats board_client_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.board_client_stats
    ADD CONSTRAINT board_client_stats_pkey PRIMARY KEY (stat_id);


--
-- Name: board_credentials board_credentials_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.board_credentials
    ADD CONSTRAINT board_credentials_pkey PRIMARY KEY (cred_id);


--
-- Name: board_daily_summary board_daily_summary_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.board_daily_summary
    ADD CONSTRAINT board_daily_summary_pkey PRIMARY KEY (summary_id);


--
-- Name: board_events board_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.board_events
    ADD CONSTRAINT board_events_pkey PRIMARY KEY (event_id);


--
-- Name: board_interface_configs board_interface_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.board_interface_configs
    ADD CONSTRAINT board_interface_configs_pkey PRIMARY KEY (config_id);


--
-- Name: board_interface_usage board_interface_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.board_interface_usage
    ADD CONSTRAINT board_interface_usage_pkey PRIMARY KEY (usage_id);


--
-- Name: board_monthly_summary board_monthly_summary_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.board_monthly_summary
    ADD CONSTRAINT board_monthly_summary_pkey PRIMARY KEY (summary_id);


--
-- Name: board_pppoe_usage board_pppoe_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.board_pppoe_usage
    ADD CONSTRAINT board_pppoe_usage_pkey PRIMARY KEY (usage_id);


--
-- Name: board_resource_stats board_resource_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.board_resource_stats
    ADD CONSTRAINT board_resource_stats_pkey PRIMARY KEY (resource_id);


--
-- Name: board_speed_stats board_speed_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.board_speed_stats
    ADD CONSTRAINT board_speed_stats_pkey PRIMARY KEY (speed_id);


--
-- Name: hotspot_usage_monthly hotspot_usage_monthly_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hotspot_usage_monthly
    ADD CONSTRAINT hotspot_usage_monthly_pkey PRIMARY KEY (summary_id);


--
-- Name: hotspot_usage_raw hotspot_usage_raw_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hotspot_usage_raw
    ADD CONSTRAINT hotspot_usage_raw_pkey PRIMARY KEY (raw_id);


--
-- Name: master_users master_users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.master_users
    ADD CONSTRAINT master_users_pkey PRIMARY KEY (user_id);


--
-- Name: master_users master_users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.master_users
    ADD CONSTRAINT master_users_username_key UNIQUE (username);


--
-- Name: mikrotik_boards mikrotik_boards_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mikrotik_boards
    ADD CONSTRAINT mikrotik_boards_pkey PRIMARY KEY (board_id);


--
-- Name: telegram_bots telegram_bots_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.telegram_bots
    ADD CONSTRAINT telegram_bots_pkey PRIMARY KEY (bot_id);


--
-- Name: telegram_recipients telegram_recipients_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.telegram_recipients
    ADD CONSTRAINT telegram_recipients_pkey PRIMARY KEY (recipient_id);


--
-- Name: user_board_access unique_access; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_board_access
    ADD CONSTRAINT unique_access UNIQUE (user_id, board_id);


--
-- Name: board_interface_configs unique_board_port; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.board_interface_configs
    ADD CONSTRAINT unique_board_port UNIQUE (board_id, interface_name);


--
-- Name: board_daily_summary unique_daily_board_sum; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.board_daily_summary
    ADD CONSTRAINT unique_daily_board_sum UNIQUE (board_id, log_date);


--
-- Name: board_interface_usage unique_daily_usage; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.board_interface_usage
    ADD CONSTRAINT unique_daily_usage UNIQUE (board_id, interface_name, log_date);


--
-- Name: telegram_recipients unique_mapping; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.telegram_recipients
    ADD CONSTRAINT unique_mapping UNIQUE (bot_id, board_id, chat_id);


--
-- Name: board_monthly_summary unique_monthly_board_sum; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.board_monthly_summary
    ADD CONSTRAINT unique_monthly_board_sum UNIQUE (board_id, log_month);


--
-- Name: board_pppoe_usage unique_pppoe_daily; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.board_pppoe_usage
    ADD CONSTRAINT unique_pppoe_daily UNIQUE (board_id, pppoe_username, log_date);


--
-- Name: hotspot_usage_raw unique_user_daily_raw; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hotspot_usage_raw
    ADD CONSTRAINT unique_user_daily_raw UNIQUE (username, board_id, log_date);


--
-- Name: hotspot_usage_monthly unique_user_monthly; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hotspot_usage_monthly
    ADD CONSTRAINT unique_user_monthly UNIQUE (username, month_period);


--
-- Name: user_board_access user_board_access_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_board_access
    ADD CONSTRAINT user_board_access_pkey PRIMARY KEY (access_id);


--
-- Name: vpn_profiles vpn_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vpn_profiles
    ADD CONSTRAINT vpn_profiles_pkey PRIMARY KEY (vpn_id);


--
-- Name: ztp_queue ztp_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ztp_queue
    ADD CONSTRAINT ztp_queue_pkey PRIMARY KEY (ztp_id);


--
-- Name: idx_active_interfaces; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_active_interfaces ON public.board_interface_configs USING btree (board_id) WHERE (is_active = true);


--
-- Name: idx_backup_board_history; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_backup_board_history ON public.board_backups USING btree (board_id, log_date DESC);


--
-- Name: idx_board_events_board_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_board_events_board_time ON public.board_events USING btree (board_id, log_time DESC);


--
-- Name: idx_board_logic; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_board_logic ON public.mikrotik_boards USING btree (is_online, is_monitor, is_public_review);


--
-- Name: idx_board_site; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_board_site ON public.mikrotik_boards USING btree (site_group);


--
-- Name: idx_client_stats_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_client_stats_time ON public.board_client_stats USING btree (board_id, log_time DESC);


--
-- Name: idx_pppoe_usage_lookup; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pppoe_usage_lookup ON public.board_pppoe_usage USING btree (log_date DESC, download_bytes DESC);


--
-- Name: idx_resource_stats_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_resource_stats_time ON public.board_resource_stats USING btree (board_id, log_time DESC);


--
-- Name: idx_speed_interface_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_speed_interface_time ON public.board_speed_stats USING btree (board_id, interface_name, log_time DESC);


--
-- Name: idx_usage_report; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_usage_report ON public.board_interface_usage USING btree (log_date DESC, board_id);


--
-- Name: idx_ztp_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ztp_status ON public.ztp_queue USING btree (status);


--
-- Name: mikrotik_boards trg_pencatat_status; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_pencatat_status AFTER UPDATE OF is_online ON public.mikrotik_boards FOR EACH ROW EXECUTE FUNCTION public.fungsi_auto_log_status();


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.master_users(user_id) ON DELETE SET NULL;


--
-- Name: automation_jobs automation_jobs_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.automation_jobs
    ADD CONSTRAINT automation_jobs_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.master_users(user_id);


--
-- Name: automation_logs automation_logs_board_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.automation_logs
    ADD CONSTRAINT automation_logs_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.mikrotik_boards(board_id) ON DELETE CASCADE;


--
-- Name: automation_logs automation_logs_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.automation_logs
    ADD CONSTRAINT automation_logs_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.automation_jobs(job_id) ON DELETE CASCADE;


--
-- Name: board_backups board_backups_board_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.board_backups
    ADD CONSTRAINT board_backups_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.mikrotik_boards(board_id) ON DELETE CASCADE;


--
-- Name: board_client_stats board_client_stats_board_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.board_client_stats
    ADD CONSTRAINT board_client_stats_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.mikrotik_boards(board_id) ON DELETE CASCADE;


--
-- Name: board_credentials board_credentials_board_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.board_credentials
    ADD CONSTRAINT board_credentials_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.mikrotik_boards(board_id) ON DELETE CASCADE;


--
-- Name: board_daily_summary board_daily_summary_board_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.board_daily_summary
    ADD CONSTRAINT board_daily_summary_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.mikrotik_boards(board_id) ON DELETE CASCADE;


--
-- Name: board_events board_events_board_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.board_events
    ADD CONSTRAINT board_events_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.mikrotik_boards(board_id) ON DELETE CASCADE;


--
-- Name: board_events board_events_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.board_events
    ADD CONSTRAINT board_events_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.master_users(user_id) ON DELETE SET NULL;


--
-- Name: board_interface_configs board_interface_configs_board_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.board_interface_configs
    ADD CONSTRAINT board_interface_configs_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.mikrotik_boards(board_id) ON DELETE CASCADE;


--
-- Name: board_interface_usage board_interface_usage_board_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.board_interface_usage
    ADD CONSTRAINT board_interface_usage_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.mikrotik_boards(board_id) ON DELETE CASCADE;


--
-- Name: board_monthly_summary board_monthly_summary_board_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.board_monthly_summary
    ADD CONSTRAINT board_monthly_summary_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.mikrotik_boards(board_id) ON DELETE CASCADE;


--
-- Name: board_pppoe_usage board_pppoe_usage_board_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.board_pppoe_usage
    ADD CONSTRAINT board_pppoe_usage_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.mikrotik_boards(board_id) ON DELETE CASCADE;


--
-- Name: board_resource_stats board_resource_stats_board_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.board_resource_stats
    ADD CONSTRAINT board_resource_stats_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.mikrotik_boards(board_id) ON DELETE CASCADE;


--
-- Name: board_speed_stats board_speed_stats_board_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.board_speed_stats
    ADD CONSTRAINT board_speed_stats_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.mikrotik_boards(board_id) ON DELETE CASCADE;


--
-- Name: hotspot_usage_raw hotspot_usage_raw_board_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hotspot_usage_raw
    ADD CONSTRAINT hotspot_usage_raw_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.mikrotik_boards(board_id) ON DELETE CASCADE;


--
-- Name: telegram_recipients telegram_recipients_board_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.telegram_recipients
    ADD CONSTRAINT telegram_recipients_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.mikrotik_boards(board_id) ON DELETE CASCADE;


--
-- Name: telegram_recipients telegram_recipients_bot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.telegram_recipients
    ADD CONSTRAINT telegram_recipients_bot_id_fkey FOREIGN KEY (bot_id) REFERENCES public.telegram_bots(bot_id) ON DELETE CASCADE;


--
-- Name: telegram_recipients telegram_recipients_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.telegram_recipients
    ADD CONSTRAINT telegram_recipients_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.master_users(user_id) ON DELETE CASCADE;


--
-- Name: user_board_access user_board_access_board_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_board_access
    ADD CONSTRAINT user_board_access_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.mikrotik_boards(board_id) ON DELETE CASCADE;


--
-- Name: user_board_access user_board_access_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_board_access
    ADD CONSTRAINT user_board_access_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.master_users(user_id) ON DELETE CASCADE;


--
-- Name: vpn_profiles vpn_profiles_board_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vpn_profiles
    ADD CONSTRAINT vpn_profiles_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.mikrotik_boards(board_id) ON DELETE CASCADE;


--
-- Name: ztp_queue ztp_queue_processed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ztp_queue
    ADD CONSTRAINT ztp_queue_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES public.master_users(user_id);


--
-- PostgreSQL database dump complete
--

\unrestrict D1EG66gt8BmZwqASHDbbgIwc6DKOyBcJZrrE1XsaVleogZfhSYbscer3TUHNIAp

