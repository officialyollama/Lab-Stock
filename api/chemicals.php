<?php
// api/chemicals.php
require_once 'config.php';
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $action = $_GET['action'] ?? 'all';
        $search = $_GET['search'] ?? '';
        
        if ($action === 'expiring') {
            // Get chemicals expiring within 30 days
            $stmt = $pdo->prepare("SELECT c.Chemical_Name, b.Batch_Number, b.Expiry_Date, b.Quantity_Received 
                                 FROM Batches b 
                                 JOIN Chemicals c ON b.Chemical_ID = c.Chemical_ID 
                                 WHERE b.Expiry_Date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)");
            $stmt->execute();
            echo json_encode($stmt->fetchAll());
        } elseif ($action === 'low_stock') {
            // Get chemicals with low stock
            $stmt = $pdo->prepare("SELECT c.Chemical_Name, s.Quantity_Available, s.Threshold, c.Unit 
                                 FROM Stock s 
                                 JOIN Chemicals c ON s.Chemical_ID = c.Chemical_ID 
                                 WHERE s.Quantity_Available < s.Threshold");
            $stmt->execute();
            echo json_encode($stmt->fetchAll());
        } else {
            // Get all or search
            $query = "SELECT c.*, s.Supplier_Name 
                      FROM Chemicals c 
                      LEFT JOIN Suppliers s ON c.Supplier_ID = s.Supplier_ID";
            if ($search) {
                $query .= " WHERE c.Chemical_Name LIKE :search";
                $stmt = $pdo->prepare($query);
                $stmt->execute(['search' => "%$search%"]);
            } else {
                $stmt = $pdo->query($query);
            }
            echo json_encode($stmt->fetchAll());
        }
        break;

    case 'POST':
        $data = json_decode(file_get_contents("php://input"), true);
        if(!$data) { echo json_encode(['error' => 'Invalid data']); break; }
        
        $stmt = $pdo->prepare("INSERT INTO Chemicals (Chemical_Name, Chemical_Type, Unit, Hazard_Level, Storage_Condition, Supplier_ID) VALUES (?, ?, ?, ?, ?, ?)");
        if ($stmt->execute([
            $data['Chemical_Name'], 
            $data['Chemical_Type'], 
            $data['Unit'], 
            $data['Hazard_Level'], 
            $data['Storage_Condition'], 
            $data['Supplier_ID'] ?: null
        ])) {
            $chem_id = $pdo->lastInsertId();
            // Create a default stock tracking row for this new chemical
            $stockStmt = $pdo->prepare("INSERT INTO Stock (Chemical_ID, Quantity_Available, Threshold) VALUES (?, 0, 10)");
            $stockStmt->execute([$chem_id]);
            
            echo json_encode(['success' => true, 'id' => $chem_id]);
        } else {
            echo json_encode(['error' => 'Failed to add chemical']);
        }
        break;

    case 'PUT':
        $data = json_decode(file_get_contents("php://input"), true);
        if(!$data || !isset($data['Chemical_ID'])) { echo json_encode(['error' => 'Invalid data']); break; }

        $stmt = $pdo->prepare("UPDATE Chemicals SET Chemical_Name=?, Chemical_Type=?, Unit=?, Hazard_Level=?, Storage_Condition=?, Supplier_ID=? WHERE Chemical_ID=?");
        if ($stmt->execute([
            $data['Chemical_Name'], 
            $data['Chemical_Type'], 
            $data['Unit'], 
            $data['Hazard_Level'], 
            $data['Storage_Condition'], 
            $data['Supplier_ID'] ?: null,
            $data['Chemical_ID']
        ])) {
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['error' => 'Failed to update chemical']);
        }
        break;

    case 'DELETE':
        $data = json_decode(file_get_contents("php://input"), true);
        if(!$data || !isset($data['Chemical_ID'])) { echo json_encode(['error' => 'Invalid data']); break; }
        
        $stmt = $pdo->prepare("DELETE FROM Chemicals WHERE Chemical_ID=?");
        if ($stmt->execute([$data['Chemical_ID']])) {
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['error' => 'Failed to delete chemical']);
        }
        break;

    default:
        echo json_encode(['error' => 'Method not allowed']);
        break;
}
?>
