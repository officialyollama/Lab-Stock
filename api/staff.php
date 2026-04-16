<?php
// api/staff.php
require_once 'config.php';
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $stmt = $pdo->query("SELECT * FROM Staff ORDER BY Staff_Name ASC");
        echo json_encode($stmt->fetchAll());
        break;

    case 'POST':
        $data = json_decode(file_get_contents("php://input"), true);
        if(!$data) { echo json_encode(['error' => 'Invalid input']); break; }
        
        $stmt = $pdo->prepare("INSERT INTO Staff (Staff_Name, Role, Email, Contact_Number) VALUES (?, ?, ?, ?)");
        if ($stmt->execute([$data['Staff_Name'], $data['Role'], $data['Email'], $data['Contact_Number']])) {
            echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
        } else {
            echo json_encode(['error' => 'Failed to add staff']);
        }
        break;

    case 'PUT':
        $data = json_decode(file_get_contents("php://input"), true);
        if(!$data || !isset($data['Staff_ID'])) { echo json_encode(['error' => 'Invalid data']); break; }
        
        $stmt = $pdo->prepare("UPDATE Staff SET Staff_Name=?, Role=?, Email=?, Contact_Number=? WHERE Staff_ID=?");
        if ($stmt->execute([$data['Staff_Name'], $data['Role'], $data['Email'], $data['Contact_Number'], $data['Staff_ID']])) {
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['error' => 'Failed to update staff']);
        }
        break;

    case 'DELETE':
        $data = json_decode(file_get_contents("php://input"), true);
        if(!$data || !isset($data['Staff_ID'])) { echo json_encode(['error' => 'Invalid data']); break; }
        
        $stmt = $pdo->prepare("DELETE FROM Staff WHERE Staff_ID=?");
        if ($stmt->execute([$data['Staff_ID']])) {
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['error' => 'Failed to delete staff']);
        }
        break;

    default:
        echo json_encode(['error' => 'Method not allowed']);
        break;
}
?>
