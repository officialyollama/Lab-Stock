<?php
// api/dashboard.php
require_once 'config.php';
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stats = [];
    
    // Total Chemicals
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM Chemicals");
    $stats['total_chemicals'] = $stmt->fetch()['count'];
    
    // Total Suppliers
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM Suppliers");
    $stats['total_suppliers'] = $stmt->fetch()['count'];
    
    // Low Stock Chemicals
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM Stock WHERE Quantity_Available < Threshold");
    $stats['low_stock'] = $stmt->fetch()['count'];
    
    // Expiring Soon (30 days)
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM Batches WHERE Expiry_Date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)");
    $stats['expiring_soon'] = $stmt->fetch()['count'];

    // Recent Activity Table (Last 10 transactions)
    $stmt = $pdo->query("SELECT t.Transaction_ID, c.Chemical_Name, t.Transaction_Type, t.Quantity, t.Transaction_Date 
                         FROM Stock_Transactions t 
                         JOIN Chemicals c ON t.Chemical_ID = c.Chemical_ID 
                         ORDER BY t.Transaction_Date DESC LIMIT 10");
    $stats['recent_activity'] = $stmt->fetchAll();

    echo json_encode($stats);
} else {
    echo json_encode(['error' => 'Method not allowed']);
}
?>
