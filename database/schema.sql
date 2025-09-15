-- Database schema for Items List Generator
-- Run this SQL to create the required tables

CREATE DATABASE IF NOT EXISTS items_list_generator;
USE items_list_generator;

-- Table: drivers (for autocomplete)
CREATE TABLE drivers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_name (name)
);

-- Table: license_plates (SPZ - for autocomplete)
CREATE TABLE license_plates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    plate_number VARCHAR(50) NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_plate_number (plate_number)
);

-- Table: lists (main lists with foreign key references)
CREATE TABLE lists (
    id INT AUTO_INCREMENT PRIMARY KEY,
    driver_id INT,
    license_plate_id INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL,
    FOREIGN KEY (license_plate_id) REFERENCES license_plates(id) ON DELETE SET NULL,
    INDEX idx_created_at (created_at),
    INDEX idx_driver (driver_id),
    INDEX idx_license_plate (license_plate_id)
);

-- Table: list_items (items belonging to lists)
CREATE TABLE list_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    list_id INT NOT NULL,
    item_text TEXT NOT NULL,
    sort_order INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE,
    INDEX idx_list_id (list_id),
    INDEX idx_sort_order (sort_order)
);

-- Insert some sample data for testing (optional)
-- You can remove this section if you don't want sample data

-- Sample drivers
INSERT INTO drivers (name) VALUES 
('John Smith'),
('Jane Doe'),
('William Jozef Simonak');

-- Sample license plates
INSERT INTO license_plates (plate_number) VALUES 
('ABC123'),
('XYZ789'),
('456165446');