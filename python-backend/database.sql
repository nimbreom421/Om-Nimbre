-- =========================================================
-- Gemini Advanced AI Chatbot Database Schema for MySQL 8.0+
-- Database: gemini_chatbot_db
-- =========================================================

CREATE DATABASE IF NOT EXISTS `gemini_chatbot_db` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `gemini_chatbot_db`;

-- 1. Users Table (Secure authentication with hashed credentials)
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(64) NOT NULL,
  `email` VARCHAR(190) NOT NULL,
  `username` VARCHAR(100) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `avatar_url` VARCHAR(500) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Conversations Table (Organized chat threads)
CREATE TABLE IF NOT EXISTS `conversations` (
  `id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) NOT NULL,
  `title` VARCHAR(255) NOT NULL DEFAULT 'New Chat',
  `model` VARCHAR(64) NOT NULL DEFAULT 'gemini-3.8-flash',
  `pinned` TINYINT(1) NOT NULL DEFAULT 0,
  `archived` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_conv_user_updated` (`user_id`, `updated_at` DESC),
  CONSTRAINT `fk_conversations_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Messages Table (Full conversation history storage)
CREATE TABLE IF NOT EXISTS `messages` (
  `id` VARCHAR(64) NOT NULL,
  `conversation_id` VARCHAR(64) NOT NULL,
  `role` ENUM('user', 'model', 'system') NOT NULL,
  `content` MEDIUMTEXT NOT NULL,
  `tokens_used` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_msg_conv_time` (`conversation_id`, `created_at` ASC),
  CONSTRAINT `fk_messages_conversation` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. User Sessions Table (Token-based authentication tracking)
CREATE TABLE IF NOT EXISTS `sessions` (
  `token` VARCHAR(128) NOT NULL,
  `user_id` VARCHAR(64) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` DATETIME NOT NULL,
  PRIMARY KEY (`token`),
  KEY `idx_session_user` (`user_id`),
  KEY `idx_session_expiry` (`expires_at`),
  CONSTRAINT `fk_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed initial demo account (Password: Gemini2026!)
INSERT INTO `users` (`id`, `email`, `username`, `password_hash`, `created_at`)
VALUES (
  'usr_demo_gemini',
  'demo@gemini.ai',
  'Gemini Explorer',
  '$2b$12$e6nJ8r1k3b2...hashed...',
  NOW()
) ON DUPLICATE KEY UPDATE `email`=`email`;
