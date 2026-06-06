<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit(); }

ini_set('display_errors', 1);
error_reporting(E_ALL);

$inData = json_decode(file_get_contents("php://input"), true);

if ($inData == null) {
    returnWithError("Invalid JSON input");
    exit();
}

$firstName = $inData["firstName"];
$lastName = $inData["lastName"];
$phone = $inData["phone"];
$email = $inData["email"];
$userId = $inData["userId"];
//make this dynamically add iput fro the users ID 
$conn = new mysqli("localhost", "TheBeast", "WeLoveCOP4331", "LAMPgroup"); //keycard into building

if ($conn->connect_error) {
    returnWithError($conn->connect_error);
    exit();
}

$stmt = $conn->prepare(
    "INSERT INTO Contacts 
    (FirstName, LastName, Phone, Email, UserID) 
    VALUES (?, ?, ?, ?, ?)"
);

if (!$stmt) {
    returnWithError($conn->error);
    exit();
}

$stmt->bind_param("ssssi", $firstName, $lastName, $phone, $email, $userId);

if (!$stmt->execute()) {
    returnWithError($stmt->error);
    exit();
}

returnContacts("Contact Added");

$stmt->close();
$conn->close();

function returnWithError($err)
{
    echo json_encode(["error" => $err]);
}

function returnContacts($txt)
{
    echo json_encode(["message" => $txt, "error" => ""]);
}
?>
