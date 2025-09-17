<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

require_once __DIR__ . '/../classes/Database.php';

try {
    $db = new Database();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed']);
    exit;
}

// get method (consider _method override)
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if (isset($_POST['_method'])) {
    $method = strtoupper($_POST['_method']);
} elseif (isset($_GET['_method'])) {
    $method = strtoupper($_GET['_method']);
} else {
    // if raw input and request method is POST but has _method in query
    if (isset($_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE'])) {
        $method = strtoupper($_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE']);
    }
}

$id = $_GET['id'] ?? null;

// parse JSON body for POST/PUT
$body = null;
$rawInput = file_get_contents('php://input');
if ($rawInput !== '') {
    $decoded = json_decode($rawInput, true);
    if (is_array($decoded)) $body = $decoded;
}

if ($method === 'GET') {
    try {
        if ($id !== null) {
            $list = $db->getListById((int)$id);
            if ($list === null) {
                http_response_code(404);
                echo json_encode(['error' => 'Not found']);
                exit;
            }
            echo json_encode($list);
            exit;
        } else if (isset($_GET['nextId'])) {
            $nextId = $db->getNextListId();
            echo json_encode(['nextId' => $nextId]);
            exit;
        } else {
            $lists = $db->getAllLists();
            echo json_encode($lists);
            exit;
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database error']);
        exit;
    }
}

if ($method === 'POST') {
    // If override indicates PUT/PATCH and id present, treat as update
    $override = null;
    if (isset($_GET['_method'])) $override = strtoupper((string)$_GET['_method']);
    elseif (isset($_POST['_method'])) $override = strtoupper((string)$_POST['_method']);
    elseif (isset($_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE'])) $override = strtoupper((string)$_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE']);

    $payload = $body ?? $_POST;
    if (($override === 'PUT' || $override === 'PATCH') && (isset($_GET['id']) || isset($payload['id']))) {
        $method = $override; // fall through to update logic below
    } else {
        // create new list; prefer JSON body
        try {
            $items = $payload['items'] ?? [];
            if (!is_array($items)) $items = [];
            $driverName = $payload['driverName'] ?? '';
            $licensePlate = $payload['licensePlate'] ?? '';
            
            $newList = $db->createList($items, $driverName, $licensePlate);
            
            http_response_code(201);
            echo json_encode($newList);
            exit;
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to create list']);
            exit;
        }
    }
}

if ($method === 'PUT' || $method === 'PATCH') {
    // update existing list; id may be in query or body
    $payload = $body ?? $_POST;
    $targetId = $id ?? ($payload['id'] ?? null);
    if ($targetId === null) {
        http_response_code(400);
        echo json_encode(['error' => 'No id provided for update']);
        exit;
    }
    
    try {
        $items = $payload['items'] ?? [];
        if (!is_array($items)) $items = [];
        $driverName = $payload['driverName'] ?? '';
        $licensePlate = $payload['licensePlate'] ?? '';
        
        $updatedList = $db->updateList((int)$targetId, $items, $driverName, $licensePlate);
        
        if ($updatedList === null) {
            http_response_code(404);
            echo json_encode(['error' => 'Not found']);
            exit;
        }
        
        echo json_encode($updatedList);
        exit;
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to update list']);
        exit;
    }
}

if ($method === 'DELETE') {
    $targetId = $id ?? ($_GET['id'] ?? null);
    if ($targetId === null) {
        http_response_code(400);
        echo json_encode(['error' => 'No id provided for delete']);
        exit;
    }
    
    try {
        $deleted = $db->deleteList((int)$targetId);
        
        if ($deleted) {
            echo json_encode(['ok' => true]);
            exit;
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Not found']);
            exit;
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to delete list']);
        exit;
    }
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
