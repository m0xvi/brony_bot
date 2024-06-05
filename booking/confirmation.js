document.addEventListener('DOMContentLoaded', function () {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('status');
    const bookingId = params.get('bookingId');

    if (paymentStatus !== 'succeeded') {
        document.querySelector('.confirmation-details').innerHTML = '<p>Оплата не завершена. Пожалуйста, завершите оплату.</p>';
        return;
    }

    // Загрузить данные бронирования из localStorage
    const formData = JSON.parse(localStorage.getItem('bookingData'));
    if (!formData || formData.bookingId !== bookingId) {
        document.querySelector('.confirmation-details').innerHTML = '<p>Ошибка: данные бронирования не найдены.</p>';
        return;
    }

    formData.bookingId = bookingId; // Убедимся, что bookingId из URL используется

    fetch('/api/book', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            document.querySelector('.confirmation-details').innerHTML = '<p>Ошибка: ' + data.error + '</p>';
            return;
        }

        // Обновляем статус оплаты
        localStorage.setItem('paymentCompleted', true);

        // Удаляем bookingId из localStorage после успешного бронирования
        localStorage.removeItem('bookingId');

        document.querySelector('#booking_id').textContent = data.bookingId;
        document.querySelector('#arrival_date').textContent = new Date(data.arrivalDate).toLocaleDateString();

        const beds = data.items.beds ? data.items.beds.split(',').map(id => `Кровать ID: ${id}`).join(', ') : '';
        const loungers = data.items.loungers ? data.items.loungers.split(',').map(id => `Шезлонг ID: ${id}`).join(', ') : '';

        document.querySelector('#beds').textContent = beds || '';
        document.querySelector('#loungers').textContent = loungers || '';
    })
    .catch(error => {
        console.error('Error creating booking:', error);
        document.querySelector('.confirmation-details').innerHTML = '<p>Ошибка создания бронирования.</p>';
    });
});
