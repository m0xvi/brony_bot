<?php
session_start();

// ������� ������ ��� �������
$valid_username = 'admin';
$valid_password = 'password';

// ��������, ���� ����� ����������
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $username = $_POST['username'];
    $password = $_POST['password'];

    if ($username == $valid_username && $password == $valid_password) {
        // �������� ��������������
        $_SESSION['loggedin'] = true;
        $_SESSION['username'] = $username;

        // ��������������� �� ���������� ��������
        header("Location: admin.html");
        exit();
    } else {
        // �������� ������� ������
        $error = "������������ ��� ������������ ��� ������.";
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Login</title>
</head>
<body>
    <?php
    if (isset($error)) {
        echo "<p style='color:red;'>$error</p>";
    }
    ?>
    <form action="admin.php" method="post">
        <label for="username">��� ������������:</label>
        <input type="text" id="username" name="username" required>
        <br>
        <label for="password">������:</label>
        <input type="password" id="password" name="password" required>
        <br>
        <button type="submit">�����</button>
    </form>
</body>
</html>
