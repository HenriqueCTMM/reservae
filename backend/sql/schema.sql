CREATE TABLE IF NOT EXISTS sessions (
    session_id VARCHAR(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL PRIMARY KEY,
    expires INT UNSIGNED NOT NULL,
    data MEDIUMTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
    KEY sessions_expires (expires)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(120) NOT NULL,
    email VARCHAR(254) NOT NULL,
    password VARCHAR(255) NOT NULL,
    perfil ENUM('cliente', 'admin') NOT NULL DEFAULT 'cliente',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY users_email_unique (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tables (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    numero SMALLINT UNSIGNED NOT NULL,
    capacidade TINYINT UNSIGNED NOT NULL,
    status ENUM('disponivel', 'indisponivel') NOT NULL DEFAULT 'disponivel',
    posicao_x SMALLINT UNSIGNED NOT NULL,
    posicao_y SMALLINT UNSIGNED NOT NULL,
    rotacao TINYINT UNSIGNED NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY tables_numero_unique (numero),
    CONSTRAINT tables_numero_check CHECK (numero >= 1),
    CONSTRAINT tables_capacidade_check CHECK (capacidade BETWEEN 1 AND 8),
    CONSTRAINT tables_rotacao_check CHECK (rotacao IN (0, 90))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS operating_settings (
    id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
    min_advance_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 180,
    slot_interval_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 30,
    demo_hours_seeded BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT operating_settings_id_check CHECK (id = 1),
    CONSTRAINT operating_settings_advance_check CHECK (min_advance_minutes = 180),
    CONSTRAINT operating_settings_interval_check CHECK (slot_interval_minutes = 30)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS weekly_operating_hours (
    dia_semana TINYINT UNSIGNED NOT NULL PRIMARY KEY,
    aberto BOOLEAN NOT NULL DEFAULT FALSE,
    inicio_turno_1 TIME NULL,
    fim_turno_1 TIME NULL,
    inicio_turno_2 TIME NULL,
    fim_turno_2 TIME NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT weekly_operating_hours_day_check CHECK (dia_semana BETWEEN 0 AND 6),
    CONSTRAINT weekly_operating_hours_open_check CHECK (aberto IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS operating_exceptions (
    data DATE NOT NULL PRIMARY KEY,
    aberto BOOLEAN NOT NULL,
    motivo VARCHAR(120) NOT NULL DEFAULT '',
    inicio_turno_1 TIME NULL,
    fim_turno_1 TIME NULL,
    inicio_turno_2 TIME NULL,
    fim_turno_2 TIME NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT operating_exceptions_open_check CHECK (aberto IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reservations (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT UNSIGNED NOT NULL,
    mesa_id INT UNSIGNED NOT NULL,
    data DATE NOT NULL,
    horario TIME NOT NULL,
    duracao_minutos SMALLINT UNSIGNED NOT NULL,
    fim_previsto TIME NOT NULL,
    pessoas TINYINT UNSIGNED NOT NULL,
    status ENUM('ativa', 'finalizada', 'cancelada', 'nao_compareceu') NOT NULL DEFAULT 'ativa',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status_updated_at TIMESTAMP NULL DEFAULT NULL,
    status_updated_by INT UNSIGNED NULL,
    status_reason VARCHAR(160) NOT NULL DEFAULT '',
    KEY reservations_table_date_status (mesa_id, data, status),
    KEY reservations_user_date_time (usuario_id, data, horario),
    KEY reservations_date_status (data, status),
    CONSTRAINT reservations_user_fk FOREIGN KEY (usuario_id)
        REFERENCES users (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT reservations_table_fk FOREIGN KEY (mesa_id)
        REFERENCES tables (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT reservations_status_user_fk FOREIGN KEY (status_updated_by)
        REFERENCES users (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT reservations_people_check CHECK (pessoas BETWEEN 1 AND 8),
    CONSTRAINT reservations_duration_check CHECK (duracao_minutos IN (90, 120, 150))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS messages (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT UNSIGNED NOT NULL,
    assunto VARCHAR(80) NOT NULL,
    mensagem VARCHAR(500) NOT NULL,
    status ENUM('aberta', 'respondida') NOT NULL DEFAULT 'aberta',
    resposta VARCHAR(500) NULL,
    resposta_em TIMESTAMP NULL DEFAULT NULL,
    resposta_por INT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY messages_user_created (usuario_id, created_at),
    CONSTRAINT messages_user_fk FOREIGN KEY (usuario_id)
        REFERENCES users (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT messages_reply_user_fk FOREIGN KEY (resposta_por)
        REFERENCES users (id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inserir apenas o que ainda não existe, preservando as configurações salvas.
INSERT INTO operating_settings (id) VALUES (1)
ON DUPLICATE KEY UPDATE id = id;

INSERT INTO weekly_operating_hours (dia_semana)
VALUES (0), (1), (2), (3), (4), (5), (6)
ON DUPLICATE KEY UPDATE dia_semana = dia_semana;
