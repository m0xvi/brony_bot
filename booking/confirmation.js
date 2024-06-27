document.addEventListener('DOMContentLoaded', function () {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('status');
    const bookingId = params.get('bookingId');

    console.log('URL Params:', { paymentStatus, bookingId });

    if (paymentStatus !== 'succeeded') {
        console.log('Payment not completed. Payment status:', paymentStatus);
        document.querySelector('.confirmation-details').innerHTML = '<p>Оплата не завершена. Пожалуйста, завершите оплату.</p>';
        return;
    }

    // Загрузить данные бронирования из localStorage
    const formData = JSON.parse(localStorage.getItem('bookingData'));
    console.log('Loaded formData from localStorage:', formData);

    if (!formData || formData.bookingId !== bookingId) {
        console.log('Booking data not found or bookingId does not match. formData:', formData, 'bookingId:', bookingId);
        document.querySelector('.confirmation-details').innerHTML = '<p>Ошибка: данные бронирования не найдены.</p>';
        return;
    }

    formData.bookingId = bookingId;
    console.log('Sending booking data to server:', formData);

    fetch('/api/book', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
    })
        .then(response => response.json())
        .then(data => {
            console.log('Data received from API:', data);
            if (data.error) {
                document.querySelector('.confirmation-details').innerHTML = '<p>Ошибка: ' + data.error + '</p>';
                return;
            }

            // Обновляем статус оплаты
            localStorage.setItem('paymentCompleted', 'true');

            // Удаляем bookingId из localStorage после успешного бронирования
            localStorage.removeItem('bookingId');

            document.querySelector('#booking_id').textContent = data.bookingId;
            document.querySelector('#arrival_date').textContent = new Date(data.arrival_date).toLocaleDateString('ru-RU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            document.querySelector('#total_price').textContent = formData.totalPrice;

            const beds = data.beds ? data.beds.split(',') : [];
            const loungers = data.loungers ? data.loungers.split(',') : [];

            const typeBeds = beds.length > 0 ? 'Кровать' : '';
            const typeLoungers = loungers.length > 0 ? 'Шезлонг' : '';

            const typeBedsElement = document.querySelector('#type_beds');
            const typeLoungersElement = document.querySelector('#type_loungers');

            if (typeBedsElement) {
                typeBedsElement.textContent = typeBeds;
            }
            if (typeLoungersElement) {
                typeLoungersElement.textContent = typeLoungers;
            }

            const imageSrc = beds.length > 0 ? 'https://pool.hotelusadba.ru/img/bed.png' : (loungers.length > 0 ? 'https://pool.hotelusadba.ru/img/lounger.png' : '');

            const imageElement = document.querySelector('#item_image');

            if (imageElement) {
                if (imageSrc) {
                    imageElement.src = imageSrc;
                } else {
                    imageElement.style.display = 'none';
                }
            }

            const bedsElement = document.querySelector('#beds');
            const loungersElement = document.querySelector('#loungers');
            const childrenElement = document.querySelector('#children');
            const childrenHidElement = document.querySelector('#hid_chid');

            if (bedsElement) {
                bedsElement.textContent = beds.length > 0 ? `${beds.length}` : '';
            }
            if (loungersElement) {
                loungersElement.textContent = loungers.length > 0 ? `${loungers.length}` : '';
            }
            if (data.children !== 0) {
                childrenElement.textContent = data.children;
            } else {
                childrenHidElement.style.display = 'none';
            }

        })
        .catch(error => {
            console.error('Error creating booking:', error);
            document.querySelector('.confirmation-details').innerHTML = '<p>Ошибка создания бронирования.</p>';
        });
});
