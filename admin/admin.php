<?php
session_start();

// Учетные данные для примера
$valid_username = 'admin';
$valid_password = 'password';

// Проверка, если форма отправлена
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $username = $_POST['username'];
    $password = $_POST['password'];

    if ($username == $valid_username && $password == $valid_password) {
        // Успешная аутентификация
        $_SESSION['loggedin'] = true;
        $_SESSION['username'] = $username;

        // Перенаправление на защищенную страницу
        header("Location: admin.html");
        exit();
    } else {
        // Неверные учетные данные
        $error = "Неправильное имя пользователя или пароль.";
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
        <label for="username">Имя пользователя:</label>
        <input type="text" id="username" name="username" required>
        <br>
        <label for="password">Пароль:</label>
        <input type="password" id="password" name="password" required>
        <br>
        <button type="submit">Войти</button>
    </form>
</body>
</html>
