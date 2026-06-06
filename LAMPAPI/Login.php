<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit(); }
    header("Content-Type: application/json");

    $inData = getRequestInfo();

    $login = $inData["login"] ?? "";
    $password = $inData["password"] ?? "";

    if ($login == "" || $password == "") {
        returnWithError("Login and password are required");
        exit();
    }

    $conn = new mysqli("localhost", "TheBeast", "WeLoveCOP4331", "LAMPgroup");

    if ($conn->connect_error) {
        returnWithError($conn->connect_error);
        exit();
    }

    $stmt = $conn->prepare("SELECT ID, FirstName, LastName, Password FROM Users WHERE Login=?");
    $stmt->bind_param("s", $login);
    $stmt->execute();

    $result = $stmt->get_result();

    if ($row = $result->fetch_assoc()) {
        if (password_verify($password, $row["Password"])) {
            returnWithInfo($row["ID"], $row["FirstName"], $row["LastName"]);
        } else {
            returnWithError("Invalid username or password");
        }
    } else {
        returnWithError("Invalid username or password");
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

