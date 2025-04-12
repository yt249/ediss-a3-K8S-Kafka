CREATE DATABASE IF NOT EXISTS bookstore;

USE bookstore;

-- Books table
CREATE TABLE IF NOT EXISTS books (
  ISBN VARCHAR(20) PRIMARY KEY,
  title VARCHAR(255),
  Author VARCHAR(255),
  description TEXT,
  genre VARCHAR(100),
  price DECIMAL(10, 2),
  quantity INT
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  address VARCHAR(255) NOT NULL,
  address2 VARCHAR(255),
  city VARCHAR(100) NOT NULL,
  state VARCHAR(2) NOT NULL,
  zipcode VARCHAR(10) NOT NULL
);
