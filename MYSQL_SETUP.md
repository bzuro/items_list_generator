# MySQL Migration Setup Instructions

## Overview
This guide will help you migrate your Items List Generator from JSON file storage to MySQL database.

## Prerequisites
- XAMPP with MySQL running
- PHP 7.4 or later
- phpMyAdmin (or MySQL command line access)

## Step-by-Step Migration

### 1. Database Setup

#### Option A: Using phpMyAdmin
1. Open phpMyAdmin (usually at `http://localhost/phpmyadmin`)
2. Click "Import" tab
3. Choose the file: `database/schema.sql`
4. Click "Go" to execute the SQL

#### Option B: Using MySQL Command Line
```bash
mysql -u root -p < database/schema.sql
```

### 2. Configure Database Connection
1. Open `config/database.php`
2. Update the database credentials if needed:
   ```php
   'host' => 'localhost',        // Usually localhost
   'database' => 'items_list_generator',
   'username' => 'root',         // Your MySQL username
   'password' => '',             // Your MySQL password (usually empty in XAMPP)
   ```

### 3. Test Database Connection
1. Open your browser and go to: `http://localhost/items_list_generator/api/lists.php`
2. You should see an empty JSON array: `[]`
3. If you see an error, check your database configuration

### 4. Migrate Existing Data (Optional)
If you have existing JSON data to migrate:

1. Open `database/migrate.php`
2. Uncomment the line: `// migrateJsonToDatabase();`
3. Run the migration by visiting: `http://localhost/items_list_generator/database/migrate.php`
4. Check the output for any errors
5. After successful migration, comment the line back or delete the migration file

### 5. Backup Your JSON Data
Before fully switching to MySQL, backup your JSON file:
```bash
copy data\lists.json data\lists.json.backup
```

## New Features

### Database Structure
- **drivers**: Stores driver names for autocomplete
- **license_plates**: Stores license plate numbers (SPZ) for autocomplete  
- **lists**: Main table for lists with foreign key references
- **list_items**: Individual items belonging to each list

### Autocomplete
- Driver names and license plates now have autocomplete functionality
- Start typing in the driver or SPZ fields to see suggestions
- Use arrow keys to navigate, Enter to select, Escape to close

### API Endpoints
- `GET api/lists.php` - Get all lists
- `GET api/lists.php?id=X` - Get specific list
- `POST api/lists.php` - Create new list
- `PUT api/lists.php?id=X` - Update existing list
- `DELETE api/lists.php?id=X` - Delete list
- `GET api/drivers.php` - Get all drivers for autocomplete
- `GET api/license_plates.php` - Get all license plates for autocomplete

## Troubleshooting

### Database Connection Errors
- Check XAMPP MySQL service is running
- Verify database credentials in `config/database.php`
- Ensure the database `items_list_generator` exists
- Check PHP error logs

### Migration Issues
- Make sure the JSON file exists at `data/lists.json`
- Check file permissions
- Verify database tables are created correctly

### Autocomplete Not Working
- Check browser console for JavaScript errors
- Verify API endpoints are accessible
- Clear browser cache

## File Structure
```
items_list_generator/
├── api/
│   ├── lists.php (updated for MySQL)
│   ├── drivers.php (new)
│   └── license_plates.php (new)
├── classes/
│   └── Database.php (new)
├── config/
│   └── database.php (new)
├── database/
│   ├── schema.sql (new)
│   └── migrate.php (new)
├── assets/js/
│   ├── new.js (updated with autocomplete)
│   └── edit.js (updated with autocomplete)
└── data/
    └── lists.json (legacy - can be removed after migration)
```

## Performance Benefits
- Faster queries with proper indexing
- Better data integrity with foreign keys
- Scalable for larger datasets
- Easier reporting and analytics
- Automatic driver/license plate deduplication