<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit(); }
    header("Content-Type: application/json");

    $inData = getRequestInfo();

    $firstName = $inData["firstName"] ?? "";
    $lastName = $inData["lastName"] ?? "";
    $login = $inData["login"] ?? "";
    $password = $inData["password"] ?? "";

    if ($firstName == "" || $lastName == "" || $login == "" || $password == "") {
        returnWithError("All fields are required");
        exit();
    }

    // Enforce password requirements
    if (strlen($password) < 8 || strlen($password) > 32) {
        returnWithError("Password must be 8 to 32 characters");
        exit();
    }
    if (!preg_match('/[a-zA-Z]/', $password)) {
        returnWithError("Password must contain at least one letter");
        exit();
    }
    if (!preg_match('/[0-9]/', $password)) {
        returnWithError("Password must contain at least one number");
        exit();
    }
    if (!preg_match('/[^a-zA-Z0-9]/', $password)) {
        returnWithError("Password must contain at least one special character");
        exit();
    }

    $conn = new mysqli("localhost", "TheBeast", "WeLoveCOP4331", "LAMPgroup");

    if ($conn->connect_error) {
        returnWithError($conn->connect_error);
        exit();
    }

    $stmt = $conn->prepare("SELECT ID FROM Users WHERE Login=?");
    $stmt->bind_param("s", $login);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        returnWithError("Username already exists");
        $stmt->close();
        $conn->close();
        exit();
    }

    $stmt->close();

    $passwordHash = password_hash($password, PASSWORD_DEFAULT);

    $stmt = $conn->prepare("INSERT INTO Users (FirstName, LastName, Login, Password) VALUES (?, ?, ?, ?)");
    $stmt->bind_param("ssss", $firstName, $lastName, $login, $passwordHash);

    if ($stmt->execute()) {
        returnWithInfo($stmt->insert_id, $firstName, $lastName);
    } else {
        returnWithError("Registration failed");
    }

    $stmt->close();
    $conn->close();

    function getRequestInfo()
    {
        return json_decode(file_get_contents('php://input'), true);
    }

    function sendResultInfoAsJson($obj)
    {
        echo $obj;
    }

    function returnWithError($err)
    {
        $retValue = '{"id":0,"firstName":"","lastName":"","error":"' . $err . '"}';
        sendResultInfoAsJson($retValue);
    }

    function returnWithInfo($id, $firstName, $lastName)
    {
        $retValue = '{"id":' . $id . ',"firstName":"' . $firstName . '","lastName":"' . $lastName . '","error":""}';
        sendResultInfoAsJson($retValue);
    }
?>
