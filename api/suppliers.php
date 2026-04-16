<?php
// api/suppliers.php
require_once 'config.php';
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $stmt = $pdo->query("SELECT * FROM Suppliers ORDER BY Supplier_Name ASC");
        echo json_encode($stmt->fetchAll());
        break;

    case 'POST':
        $data = json_decode(file_get_contents("php://input"), true);
        if(!$data) { echo json_encode(['error' => 'Invalid input']); break; }
        
        $stmt = $pdo->prepare("INSERT INTO Suppliers (Supplier_Name, Email, Contact_Number, Address) VALUES (?, ?, ?, ?)");
        if ($stmt->execute([$data['Supplier_Name'], $data['Email'], $data['Contact_Number'], $data['Address']])) {
            echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
        } else {
            echo json_encode(['error' => 'Failed to create supplier']);
        }
        break;

    case 'PUT':
        $data = json_decode(file_get_contents("php://input"), true);
        if(!$data || !isset($data['Supplier_ID'])) { echo json_encode(['error' => 'Invalid data']); break; }
        
        $stmt = $pdo->prepare("UPDATE Suppliers SET Supplier_Name=?, Email=?, Contact_Number=?, Address=? WHERE Supplier_ID=?");
        if ($stmt->execute([$data['Supplier_Name'], $data['Email'], $data['Contact_Number'], $data['Address'], $data['Supplier_ID']])) {
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['error' => 'Failed to update supplier']);
        }
        break;

    case 'DELETE':
        $data = json_decode(file_get_contents("php://input"), true);
        if(!$data || !isset($data['Supplier_ID'])) { echo json_encode(['error' => 'Invalid data']); break; }
        
        $stmt = $pdo->prepare("DELETE FROM Suppliers WHERE Supplier_ID=?");
        if ($stmt->execute([$data['Supplier_ID']])) {
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['error' => 'Failed to delete supplier']);
        }
        break;

    default:
        echo json_encode(['error' => 'Method not allowed']);
        break;
}
?>
