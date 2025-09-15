<?php
declare(strict_types=1);

// Migration script to import existing JSON data into MySQL database
// Run this script once after setting up the database

require_once __DIR__ . '/../classes/Database.php';

function migrateJsonToDatabase(): void {
    $dataFile = __DIR__ . '/../data/lists.json';
    
    if (!file_exists($dataFile)) {
        echo "No JSON data file found at: $dataFile\n";
        echo "Migration completed (no data to migrate).\n";
        return;
    }
    
    try {
        $db = new Database();
        
        $jsonData = file_get_contents($dataFile);
        $lists = json_decode($jsonData, true);
        
        if (!is_array($lists)) {
            echo "Invalid JSON data format.\n";
            return;
        }
        
        echo "Starting migration of " . count($lists) . " lists...\n";
        
        foreach ($lists as $list) {
            $items = $list['items'] ?? [];
            $driverName = $list['driverName'] ?? '';
            $licensePlate = $list['licensePlate'] ?? '';
            
            try {
                $newList = $db->createList($items, $driverName, $licensePlate);
                echo "Migrated list ID {$list['id']} -> New ID {$newList['id']}\n";
            } catch (Exception $e) {
                echo "Failed to migrate list ID {$list['id']}: " . $e->getMessage() . "\n";
            }
        }
        
        echo "\nMigration completed successfully!\n";
        echo "You can now backup and remove the JSON file: $dataFile\n";
        
    } catch (Exception $e) {
        echo "Migration failed: " . $e->getMessage() . "\n";
        echo "Make sure the database is set up and the connection details are correct.\n";
    }
}

// Run migration
echo "=== JSON to MySQL Migration ===\n";
echo "This will import all existing lists from JSON into the MySQL database.\n";
echo "Make sure you have:\n";
echo "1. Created the MySQL database\n";
echo "2. Run the schema.sql file\n";
echo "3. Updated the database config in config/database.php\n\n";

// Uncomment the next line to run the migration
// migrateJsonToDatabase();

echo "To run the migration, uncomment the migrateJsonToDatabase() call in this file.\n";