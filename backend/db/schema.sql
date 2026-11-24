-- MySQL schema for the ToDo API.
-- The app also creates this table automatically on startup when DATA_SOURCE=mysql.
CREATE DATABASE IF NOT EXISTS todo_app;
USE todo_app;

CREATE TABLE IF NOT EXISTS todos (
  id          CHAR(36)     NOT NULL PRIMARY KEY,
  title       VARCHAR(255) NOT NULL,
  description TEXT         NULL,
  completed   BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at  DATETIME(3)  NOT NULL,
  updated_at  DATETIME(3)  NOT NULL
);
