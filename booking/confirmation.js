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

    console.log('formData.items:', formData.items);

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
            document.querySelector('#arrival_date').textContent = new Date(data.arrivalDate).toLocaleDateString('ru-RU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            document.querySelector('#total_price').textContent = formData.totalPrice;


            const typeBeds = data.items.beds ? data.items.beds.split(',').map(id => `Кровать`).join(', ') : '';
            const typeLoungers = data.items.loungers ? data.items.loungers.split(',').map(id => `Шезлонг`).join(', ') : '';

            document.querySelector('#type_beds').textContent = typeBeds || '';
            document.querySelector('#type_loungers').textContent = typeLoungers || '';

            const imgBeds = data.items.beds ? data.items.beds.split(',').map(id => `https://pool.hotelusadba.ru/img/bed.png`).join(', ') : '';
            const imgLoungers = data.items.loungers ? data.items.loungers.split(',').map(id => `https://pool.hotelusadba.ru/img/lounger.png`).join(', ') : '';


            const imageBedsElement = document.querySelector('#image_beds');
            const imageLoungersElement = document.querySelector('#image_loungers');

            if (imgBeds) {
                document.querySelector('#image_beds').src = imgBeds;
            } else {
                imageBedsElement.style.display = 'none';
            }

            if (imgLoungers) {
                document.querySelector('#image_loungers').src = imgLoungers;
            } else {
                imageLoungersElement.style.display = 'none';
            }

            // Подсчитываем количество кроватей и шезлонгов
            const beds = data.items.beds ? data.items.beds.split(',').length : 0;
            const loungers = data.items.loungers ? data.items.loungers.split(',').length : 0;

            document.querySelector('#beds').textContent = beds > 0 ? `${beds}` : '';
            document.querySelector('#loungers').textContent = loungers > 0 ? `${loungers}` : '';
        })
        .catch(error => {
            console.error('Error creating booking:', error);
            document.querySelector('.confirmation-details').innerHTML = '<p>Ошибка создания бронирования.</p>';
        });
});
