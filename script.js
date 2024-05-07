const tg = window.Telegram.WebApp;

document.addEventListener('DOMContentLoaded', function() {
    const bedsInput = document.getElementById('beds');
    const loungersInput = document.getElementById('loungers');
    const childCheckbox = document.getElementById('child');
    const totalPriceElement = document.getElementById('totalPrice');
    const phoneInput = document.getElementById('phone');
    const commentsInput = document.getElementById('comments');

    // Функция для обновления итоговой цены в зависимости от введенных данных
    function updateTotalPrice() {
        const beds = parseInt(bedsInput.value) || 0;
        const loungers = parseInt(loungersInput.value) || 0;
        const child = childCheckbox.checked ? 500 : 0;
        const total = (beds * 4000) + (loungers * 2000) + child;
        totalPriceElement.textContent = total;
    }

    // Подписка на события изменения значений элементов формы для перерасчета цены
    bedsInput.addEventListener('change', updateTotalPrice);
    loungersInput.addEventListener('change', updateTotalPrice);
    childCheckbox.addEventListener('change', updateTotalPrice);

    // Инициализация итоговой цены при загрузке страницы
    updateTotalPrice();

    // Обработчик клика по кнопке "Забронировать"
    document.querySelector('.book-btn').addEventListener('click', function() {
        const formData = {
            arrivalDate: document.getElementById('arrival-date').value,
            arrivalTime: document.getElementById('arrival-time').value,
            departureDate: document.getElementById('departure-date').value,
            departureTime: document.getElementById('departure-time').value,
            beds: parseInt(document.getElementById('beds').value),
            loungers: parseInt(document.getElementById('loungers').value),
            child: document.getElementById('child').checked,
            phone: document.getElementById('phone').value,
            comments: document.getElementById('comments').value
        };

        // Отправка данных на сервер с использованием fetch API
        fetch('http://localhost:3000/book', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        })
        .then(response => response.text())
        .then(data => {
            console.log('Success:', data);
            alert('Бронирование успешно сохранено!');
            // Здесь можно добавить логику для закрытия формы или сообщения пользователю
        })
        .catch((error) => {
            console.error('Error:', error);
            alert('Ошибка при бронировании. Проверьте консоль для деталей.');
        });
    });
});
