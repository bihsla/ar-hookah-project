<?php
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'message' => 'POST required']);
    exit;
}

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);

if (!is_array($data) || ($data['event'] ?? '') !== 'exhale') {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'Invalid event']);
    exit;
}

$record = [
    'event' => 'exhale',
    'time' => date('c'),
    'count' => max(1, (int)($data['count'] ?? 1))
];

$dir = dirname(__DIR__) . '/data';
if (!is_dir($dir) && !mkdir($dir, 0755, true)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'message' => 'Could not create data folder']);
    exit;
}

$file = $dir . '/sessions.json';
$records = [];
if (is_file($file)) {
    $existing = json_decode(file_get_contents($file), true);
    if (is_array($existing)) $records = $existing;
}

$records[] = $record;
if (count($records) > 5000) $records = array_slice($records, -5000);

if (file_put_contents($file, json_encode($records, JSON_PRETTY_PRINT), LOCK_EX) === false) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'message' => 'Could not save session']);
    exit;
}

echo json_encode(['ok' => true]);
