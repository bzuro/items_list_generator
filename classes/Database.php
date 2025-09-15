<?php
declare(strict_types=1);

class Database {
    private PDO $pdo;
    
    public function __construct() {
        $config = require __DIR__ . '/../config/database.php';
        
        $dsn = "mysql:host={$config['host']};port={$config['port']};dbname={$config['database']};charset={$config['charset']}";
        
        try {
            $this->pdo = new PDO($dsn, $config['username'], $config['password'], $config['options']);
        } catch (PDOException $e) {
            throw new Exception("Database connection failed: " . $e->getMessage());
        }
    }
    
    public function getPdo(): PDO {
        return $this->pdo;
    }
    
    // Driver methods
    public function findOrCreateDriver(string $name): int {
        if (empty(trim($name))) {
            return 0; // Return 0 for empty driver name (will be NULL in database)
        }
        
        $stmt = $this->pdo->prepare("SELECT id FROM drivers WHERE name = ?");
        $stmt->execute([$name]);
        $result = $stmt->fetch();
        
        if ($result) {
            return (int)$result['id'];
        }
        
        $stmt = $this->pdo->prepare("INSERT INTO drivers (name) VALUES (?)");
        $stmt->execute([$name]);
        return (int)$this->pdo->lastInsertId();
    }
    
    public function getAllDrivers(): array {
        $stmt = $this->pdo->query("SELECT name FROM drivers ORDER BY name");
        return $stmt->fetchAll(PDO::FETCH_COLUMN);
    }
    
    public function getDriverById(int $id): ?string {
        $stmt = $this->pdo->prepare("SELECT name FROM drivers WHERE id = ?");
        $stmt->execute([$id]);
        $result = $stmt->fetch();
        return $result ? $result['name'] : null;
    }
    
    // License plate methods
    public function findOrCreateLicensePlate(string $plateNumber): int {
        if (empty(trim($plateNumber))) {
            return 0; // Return 0 for empty plate number (will be NULL in database)
        }
        
        $stmt = $this->pdo->prepare("SELECT id FROM license_plates WHERE plate_number = ?");
        $stmt->execute([$plateNumber]);
        $result = $stmt->fetch();
        
        if ($result) {
            return (int)$result['id'];
        }
        
        $stmt = $this->pdo->prepare("INSERT INTO license_plates (plate_number) VALUES (?)");
        $stmt->execute([$plateNumber]);
        return (int)$this->pdo->lastInsertId();
    }
    
    public function getAllLicensePlates(): array {
        $stmt = $this->pdo->query("SELECT plate_number FROM license_plates ORDER BY plate_number");
        return $stmt->fetchAll(PDO::FETCH_COLUMN);
    }
    
    public function getLicensePlateById(int $id): ?string {
        $stmt = $this->pdo->prepare("SELECT plate_number FROM license_plates WHERE id = ?");
        $stmt->execute([$id]);
        $result = $stmt->fetch();
        return $result ? $result['plate_number'] : null;
    }
    
    // List methods
    public function createList(array $items, string $driverName, string $licensePlate): array {
        $this->pdo->beginTransaction();
        
        try {
            $driverId = $this->findOrCreateDriver($driverName);
            $licensePlateId = $this->findOrCreateLicensePlate($licensePlate);
            
            // Insert list
            $stmt = $this->pdo->prepare("
                INSERT INTO lists (driver_id, license_plate_id, created_at, updated_at) 
                VALUES (?, ?, NOW(), NOW())
            ");
            $stmt->execute([
                $driverId > 0 ? $driverId : null,
                $licensePlateId > 0 ? $licensePlateId : null
            ]);
            
            $listId = (int)$this->pdo->lastInsertId();
            
            // Insert items
            if (!empty($items)) {
                $stmt = $this->pdo->prepare("
                    INSERT INTO list_items (list_id, item_text, sort_order) 
                    VALUES (?, ?, ?)
                ");
                
                foreach ($items as $index => $item) {
                    $stmt->execute([$listId, $item, $index]);
                }
            }
            
            $this->pdo->commit();
            
            return $this->getListById($listId);
            
        } catch (Exception $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }
    
    public function getListById(int $id): ?array {
        // Get list with driver and license plate info
        $stmt = $this->pdo->prepare("
            SELECT 
                l.id,
                l.created_at,
                l.updated_at,
                d.name as driver_name,
                lp.plate_number as license_plate
            FROM lists l
            LEFT JOIN drivers d ON l.driver_id = d.id
            LEFT JOIN license_plates lp ON l.license_plate_id = lp.id
            WHERE l.id = ?
        ");
        $stmt->execute([$id]);
        $list = $stmt->fetch();
        
        if (!$list) {
            return null;
        }
        
        // Get items
        $stmt = $this->pdo->prepare("
            SELECT item_text 
            FROM list_items 
            WHERE list_id = ? 
            ORDER BY sort_order, id
        ");
        $stmt->execute([$id]);
        $items = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        return [
            'id' => (int)$list['id'],
            'items' => $items,
            'driverName' => $list['driver_name'] ?? '',
            'licensePlate' => $list['license_plate'] ?? '',
            'createdAt' => $list['created_at'],
            'updatedAt' => $list['updated_at']
        ];
    }
    
    public function getAllLists(): array {
        $stmt = $this->pdo->query("
            SELECT 
                l.id,
                l.created_at,
                l.updated_at,
                d.name as driver_name,
                lp.plate_number as license_plate,
                COUNT(li.id) as item_count
            FROM lists l
            LEFT JOIN drivers d ON l.driver_id = d.id
            LEFT JOIN license_plates lp ON l.license_plate_id = lp.id
            LEFT JOIN list_items li ON l.id = li.list_id
            GROUP BY l.id, l.created_at, l.updated_at, d.name, lp.plate_number
            ORDER BY l.created_at DESC
        ");
        
        $lists = [];
        while ($row = $stmt->fetch()) {
            // Get items for this list
            $itemsStmt = $this->pdo->prepare("
                SELECT item_text 
                FROM list_items 
                WHERE list_id = ? 
                ORDER BY sort_order, id
            ");
            $itemsStmt->execute([$row['id']]);
            $items = $itemsStmt->fetchAll(PDO::FETCH_COLUMN);
            
            $lists[] = [
                'id' => (int)$row['id'],
                'items' => $items,
                'driverName' => $row['driver_name'] ?? '',
                'licensePlate' => $row['license_plate'] ?? '',
                'createdAt' => $row['created_at'],
                'updatedAt' => $row['updated_at']
            ];
        }
        
        return $lists;
    }
    
    public function updateList(int $id, array $items, string $driverName, string $licensePlate): ?array {
        $this->pdo->beginTransaction();
        
        try {
            $driverId = $this->findOrCreateDriver($driverName);
            $licensePlateId = $this->findOrCreateLicensePlate($licensePlate);
            
            // Update list
            $stmt = $this->pdo->prepare("
                UPDATE lists 
                SET driver_id = ?, license_plate_id = ?, updated_at = NOW() 
                WHERE id = ?
            ");
            $stmt->execute([
                $driverId > 0 ? $driverId : null,
                $licensePlateId > 0 ? $licensePlateId : null,
                $id
            ]);
            
            if ($stmt->rowCount() === 0) {
                $this->pdo->rollBack();
                return null; // List not found
            }
            
            // Delete existing items
            $stmt = $this->pdo->prepare("DELETE FROM list_items WHERE list_id = ?");
            $stmt->execute([$id]);
            
            // Insert new items
            if (!empty($items)) {
                $stmt = $this->pdo->prepare("
                    INSERT INTO list_items (list_id, item_text, sort_order) 
                    VALUES (?, ?, ?)
                ");
                
                foreach ($items as $index => $item) {
                    $stmt->execute([$id, $item, $index]);
                }
            }
            
            $this->pdo->commit();
            
            return $this->getListById($id);
            
        } catch (Exception $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }
    
    public function deleteList(int $id): bool {
        $stmt = $this->pdo->prepare("DELETE FROM lists WHERE id = ?");
        $stmt->execute([$id]);
        
        return $stmt->rowCount() > 0;
    }
}