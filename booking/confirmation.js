document.addEventListener('DOMContentLoaded', async function () {
    const urlParams = new URLSearchParams(window.location.search);
    const bookingId = urlParams.get('bookingId');
    const paymentStatus = urlParams.get('status');

    const messageDiv = document.getElementById('confirmation-message');
    const bookingDetailsDiv = document.getElementById('booking-details');

    if (!bookingId) {
        messageDiv.textContent = 'Идентификатор бронирования не найден.';
        return;
    }

    if (paymentStatus === 'succeeded') {
        messageDiv.textContent = 'Ваше бронирование успешно подтверждено.';
    } else {
        messageDiv.textContent = 'Платеж не прошел или был отменен.';
        return;
    }

    try {
        const response = await fetch(`/api/booking/${bookingId}`);
        const bookingData = await response.json();

        if (!response.ok) {
            throw new Error(bookingData.error || 'Ошибка при получении данных бронирования');
        }

        bookingDetailsDiv.innerHTML = `
            <h3>Детали бронирования</h3>
            <p>Идентификатор бронирования: ${bookingData.booking_id}</p>
            <p>Дата: ${new Date(bookingData.arrival_date).toLocaleDateString()}</p>
            <p>Кровати: ${bookingData.beds ? bookingData.beds.split(',').map(id => `Кровать ID: ${id}`).join(', ') : 'Нет'}</p>
            <p>Шезлонги: ${bookingData.loungers ? bookingData.loungers.split(',').map(id => `Шезлонг ID: ${id}`).join(', ') : 'Нет'}</p>
        `;
    } catch (error) {
        console.error('Ошибка:', error);
        bookingDetailsDiv.innerHTML = `<p>Ошибка при получении данных бронирования: ${error.message}</p>`;
    }
});
