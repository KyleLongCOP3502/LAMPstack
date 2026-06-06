<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit(); }
$inData = getRequestInfo();
$conn = new mysqli("localhost", "TheBeast", "WeLoveCOP4331", "LAMPgroup");
if ($conn->connect_error)
{
    returnWithError($conn->connect_error);
}
else
{
    $stmt = $conn->prepare("UPDATE Contacts SET FirstName=?, LastName=?, Phone=?, Email=? WHERE ID=? AND UserID=?");
    $stmt->bind_param("ssssii",
        $inData["firstName"],
        $inData["lastName"],
        $inData["phone"],
        $inData["email"],
        $inData["contactId"],
        $inData["userId"]
    );
    $stmt->execute();
    if($stmt->affected_rows > 0)
    {
        returnWithInfo("Contact updated successfully");
    }
    else
    {
        returnWithError("No contact was updated");
    }
    $stmt->close();
    $conn->close();
}
function getRequestInfo()
{
    return json_decode(file_get_contents('php://input'), true);
}
function sendResultInfoAsJson($obj)
{
    header('Content-type: application/json');
    echo $obj;
}
function returnWithError($err)
{
    $retValue = '{"error":"' . $err . '"}';
    sendResultInfoAsJson($retValue);
}
function returnWithInfo($msg)
{
    $retValue = '{"error":"","message":"' . $msg . '"}';
    sendResultInfoAsJson($retValue);
}
?>
