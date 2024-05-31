<?php
session_start();

// Удалить все данные сессии
session_unset();

// Уничтожить сессию
session_destroy();

// Перенаправить пользователя на страницу входа
header("Location: admin.php");
exit();
?>
