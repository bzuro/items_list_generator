<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');

$dataDir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'data';
$dataFile = $dataDir . DIRECTORY_SEPARATOR . 'lists.json';

if (!is_dir($dataDir)) {
    mkdir($dataDir, 0777, true);
}
if (!file_exists($dataFile)) {
    file_put_contents($dataFile, json_encode([]));
}

function read_lists(string $file): array {
    $raw = file_get_contents($file);
    $lists = json_decode($raw, true);
    if (!is_array($lists)) return [];
    return $lists;
}
function write_lists(string $file, array $lists): void {
    // atomic write
    $tmp = $file . '.tmp';
    file_put_contents($tmp, json_encode($lists, JSON_PRETTY_PRINT));
    rename($tmp, $file);
}

function get_next_id(array $lists): int {
    $max = 0;
    foreach ($lists as $l) {
        if (isset($l['id']) && is_numeric($l['id'])) {
            $max = max($max, (int)$l['id']);
        }
    }
    return $max + 1;
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

// use lists file
$lists = read_lists($dataFile);

if ($method === 'GET') {
    if ($id !== null) {
        foreach ($lists as $l) {
            if ((string)$l['id'] === (string)$id) {
                echo json_encode($l);
                exit;
            }
        }
        http_response_code(404);
        echo json_encode(['error' => 'Not found']);
        exit;
    } else {
        echo json_encode($lists);
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
        $items = $payload['items'] ?? [];
        if (!is_array($items)) $items = [];
        $driverName = $payload['driverName'] ?? '';
        $licensePlate = $payload['licensePlate'] ?? '';
        $now = (new DateTime())->format(DateTime::ATOM);
        $new = [
            'id' => get_next_id($lists),
            'items' => array_values($items),
            'driverName' => $driverName,
            'licensePlate' => $licensePlate,
            'createdAt' => $now,
            'updatedAt' => $now
        ];
        $lists[] = $new;
        write_lists($dataFile, $lists);
        http_response_code(201);
        echo json_encode($new);
        exit;
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
    $found = false;
    foreach ($lists as $idx => $l) {
        if ((string)$l['id'] === (string)$targetId) {
            $found = true;
            $items = $payload['items'] ?? $l['items'] ?? [];
            if (!is_array($items)) $items = [];
            $lists[$idx]['items'] = array_values($items);
            $lists[$idx]['driverName'] = $payload['driverName'] ?? $l['driverName'] ?? '';
            $lists[$idx]['licensePlate'] = $payload['licensePlate'] ?? $l['licensePlate'] ?? '';
            $lists[$idx]['updatedAt'] = (new DateTime())->format(DateTime::ATOM);
            write_lists($dataFile, $lists);
            echo json_encode($lists[$idx]);
            exit;
        }
    }
    if (!$found) {
        http_response_code(404);
        echo json_encode(['error' => 'Not found']);
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
    $newLists = [];
    $deleted = false;
    foreach ($lists as $l) {
        if ((string)$l['id'] === (string)$targetId) {
            $deleted = true;
            continue;
        }
        $newLists[] = $l;
    }
    if ($deleted) {
        write_lists($dataFile, $newLists);
        echo json_encode(['ok' => true]);
        exit;
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'Not found']);
        exit;
    }
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
