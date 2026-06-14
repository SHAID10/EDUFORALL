<?php
// Quick diagnostic: check PHP extensions and write test JSON
error_reporting(E_ALL);

$results = [
    'php_version' => PHP_VERSION,
    'pdo_loaded' => extension_loaded('PDO'),
    'pdo_sqlite' => extension_loaded('pdo_sqlite'),
    'pdo_mysql' => extension_loaded('pdo_mysql'),
    'sqlite3_loaded' => extension_loaded('sqlite3'),
    'cwd' => __DIR__,
    'db_file_exists' => file_exists(__DIR__ . '/eduforall.db'),
    'db_file_writable' => is_writable(__DIR__),
];

// Try to create a quick SQLite connection
if ($results['pdo_sqlite']) {
    try {
        $pdo = new PDO('sqlite::memory:');
        $results['sqlite_connect_test'] = 'OK';
    } catch (Exception $e) {
        $results['sqlite_connect_test'] = 'FAIL: ' . $e->getMessage();
    }
} else {
    $results['sqlite_connect_test'] = 'PDO SQLite not available';
}

// Try real db.php include
try {
    require_once __DIR__ . '/db.php';
    $conn = DB::getConnection();
    $type = DB::getDbType();
    $results['db_connection'] = 'OK (' . $type . ')';

    // Try a simple query
    $stmt = $conn->query("SELECT COUNT(*) FROM users");
    $results['users_count'] = $stmt->fetchColumn();
} catch (Exception $e) {
    $results['db_connection'] = 'FAIL: ' . $e->getMessage();
}

header('Content-Type: application/json');
echo json_encode($results, JSON_PRETTY_PRINT);
