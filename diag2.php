<?php
// diag2.php - extended PHP info check
$info = [
    'php_version' => PHP_VERSION,
    'extensions' => get_loaded_extensions(),
];
header('Content-Type: application/json');
echo json_encode($info, JSON_PRETTY_PRINT);
