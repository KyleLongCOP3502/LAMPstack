<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit(); }
header("Content-Type: application/json");

$inData = json_decode(file_get_contents('php://input'), true);
$id = $inData["id"] ?? 0;

if ($id == 0) {
    echo json_encode(["error" => "Invalid contact ID"]);
    exit();
}

$conn = new mysqli("localhost", "TheBeast", "WeLoveCOP4331", "LAMPgroup");

if ($conn->connect_error) {
    echo json_encode(["error" => $conn->connect_error]);
    exit();
}

$stmt = $conn->prepare("DELETE FROM Contacts WHERE ID = ?");
$stmt->bind_param("i", $id);
$stmt->execute();

if ($stmt->affected_rows > 0) {
    echo json_encode(["error" => ""]);
} else {
    echo json_encode(["error" => "Contact not found"]);
}

$stmt->close();
$conn->close();
?>
