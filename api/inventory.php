<?php
// api/inventory.php
require_once 'config.php';
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'GET') {
    if ($action === 'batches') {
        $stmt = $pdo->query("SELECT b.*, c.Chemical_Name 
                             FROM Batches b 
                             JOIN Chemicals c ON b.Chemical_ID = c.Chemical_ID 
                             ORDER BY b.Expiry_Date ASC");
        echo json_encode($stmt->fetchAll());
        
    } elseif ($action === 'stock') {
        $stmt = $pdo->query("SELECT s.*, c.Chemical_Name 
                             FROM Stock s 
                             JOIN Chemicals c ON s.Chemical_ID = c.Chemical_ID 
                             ORDER BY c.Chemical_Name ASC");
        echo json_encode($stmt->fetchAll());
        
    } elseif ($action === 'transactions') {
        $stmt = $pdo->query("SELECT t.*, c.Chemical_Name 
                             FROM Stock_Transactions t 
                             JOIN Chemicals c ON t.Chemical_ID = c.Chemical_ID 
                             ORDER BY t.Transaction_Date DESC");
        echo json_encode($stmt->fetchAll());
    } else {
        echo json_encode(['error' => 'Invalid GET action']);
    }
} elseif ($method === 'POST') {
    
    $data = json_decode(file_get_contents("php://input"), true);
    if(!$data) { echo json_encode(['error' => 'Invalid input']); exit; }

    if ($action === 'batch') {
        // Add new batch and update stock
        try {
            $pdo->beginTransaction();
            
            // Insert Batch
            $stmt = $pdo->prepare("INSERT INTO Batches (Chemical_ID, Batch_Number, Manufacture_Date, Expiry_Date, Quantity_Received, Unit_Price) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $data['Chemical_ID'], 
                $data['Batch_Number'], 
                $data['Manufacture_Date'], 
                $data['Expiry_Date'], 
                $data['Quantity'], 
                $data['Unit_Price']
            ]);
            $batch_id = $pdo->lastInsertId();
            
            // Log Transaction as Purchase
            $txStmt = $pdo->prepare("INSERT INTO Stock_Transactions (Chemical_ID, Batch_ID, Staff_ID, Transaction_Type, Quantity) VALUES (?, ?, ?, 'Purchase', ?)");
            // Hardcode staff_id 1 for now if not provided
            $staff_id = $data['Staff_ID'] ?? 1; 
            $txStmt->execute([$data['Chemical_ID'], $batch_id, $staff_id, $data['Quantity']]);

            // Update Stock
            $stockStmt = $pdo->prepare("UPDATE Stock SET Quantity_Available = Quantity_Available + ? WHERE Chemical_ID = ?");
            $stockStmt->execute([$data['Quantity'], $data['Chemical_ID']]);
            
            $pdo->commit();
            echo json_encode(['success' => true]);
        } catch(Exception $e) {
            $pdo->rollBack();
            echo json_encode(['error' => 'Transaction failed: ' . $e->getMessage()]);
        }

    } elseif ($action === 'transaction') {
        // Log generic stock usage/disposal/transfer
        try {
            $pdo->beginTransaction();
            
            // Verify enough stock if it's Usage/Disposal/Transfer
            $qty = floatval($data['Quantity']);
            $type = $data['Transaction_Type']; 
            
            $checkStmt = $pdo->prepare("SELECT Quantity_Available FROM Stock WHERE Chemical_ID = ?");
            $checkStmt->execute([$data['Chemical_ID']]);
            $currentStock = floatval($checkStmt->fetchColumn());
            
            if ($type !== 'Purchase' && $currentStock < $qty) {
                 echo json_encode(['error' => 'Insufficient stock for this transaction']);
                 $pdo->rollBack();
                 exit;
            }

            // Insert Transaction
            $txStmt = $pdo->prepare("INSERT INTO Stock_Transactions (Chemical_ID, Staff_ID, Transaction_Type, Quantity) VALUES (?, ?, ?, ?)");
            $staff_id = $data['Staff_ID'] ?? 1;
            $txStmt->execute([$data['Chemical_ID'], $staff_id, $type, $qty]);

            // Update Stock (Subtract if not purchase)
            if ($type !== 'Purchase') {
               $stockStmt = $pdo->prepare("UPDATE Stock SET Quantity_Available = Quantity_Available - ? WHERE Chemical_ID = ?");
            } else {
               $stockStmt = $pdo->prepare("UPDATE Stock SET Quantity_Available = Quantity_Available + ? WHERE Chemical_ID = ?");
            }
            $stockStmt->execute([$qty, $data['Chemical_ID']]);
            
            $pdo->commit();
            echo json_encode(['success' => true]);
        } catch(Exception $e) {
            $pdo->rollBack();
            echo json_encode(['error' => 'Transaction failed: ' . $e->getMessage()]);
        }
    } else {
        echo json_encode(['error' => 'Invalid POST action']);
    }
}
?>
