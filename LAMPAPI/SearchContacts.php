<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit(); }
header("Cache-Control: no-cache, no-store, must-revalidate");
header("Pragma: no-cache");
header("Expires: 0");
$inData = getRequestInfo();
$searchResults = "";
$searchCount = 0;
$conn = new mysqli("localhost", "TheBeast", "WeLoveCOP4331", "LAMPgroup");
if ($conn->connect_error)
{
    returnWithError($conn->connect_error);
}
else
{
    $stmt = $conn->prepare("SELECT ID, FirstName, LastName, Phone, Email FROM Contacts WHERE FirstName LIKE ? AND UserID=?");
    $searchName = "%" . $inData["search"] . "%";
    $stmt->bind_param("si", $searchName, $inData["userId"]);
    $stmt->execute();
    $result = $stmt->get_result();
    while($row = $result->fetch_assoc())
    {
        if($searchCount > 0)
        {
            $searchResults .= ",";
        }
        $searchCount++;
        $searchResults .= '{"id":"' . $row["ID"] . '","firstName":"' . $row["FirstName"] . '","lastName":"' . $row["LastName"] . '","phone":"' . $row["Phone"] . '","email":"' . $row["Email"] . '"}';
    }
    if($searchCount == 0)
    {
        returnWithError("No Records Found");
    }
    else
    {
        returnWithInfo($searchResults);
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
    $retValue = '{"results":[],"error":"' . $err . '"}';
    sendResultInfoAsJson($retValue);
}
function returnWithInfo($searchResults)
{
    $retValue = '{"results":[' . $searchResults . '],"error":""}';
    sendResultInfoAsJson($retValue);
}
?>
