document.addEventListener('DOMContentLoaded', function () {
    const confirmationData = JSON.parse(localStorage.getItem('bookingConfirmation'));

    const detailsContainer = document.getElementById('confirmation-details');
    const bookingIdContainer = document.getElementById('booking-id');
    const messageDiv = document.getElementById('confirmation-message');

    if (confirmationData) {
        detailsContainer.innerHTML = `
            <p>Вы забронировали ${confirmationData.items.length} ${confirmationData.items.length > 1 ? 'кровати' : 'кровать'}. <br> Дата: ${confirmationData.arrivalDate}.</p>
        `;

        bookingIdContainer.innerHTML = `
            <p>Ваш идентификатор: <br> ${confirmationData.bookingId}</p>
        `;
    } else {
        detailsContainer.innerHTML = '<p>Информация о бронировании недоступна.</p>';
    }

    const urlParams = new URLSearchParams(window.location.search);
    const bookingId = urlParams.get('bookingId');
    const paymentStatus = urlParams.get('status');

    if (paymentStatus === 'succeeded') {
        messageDiv.textContent = `Ваше бронирование с идентификатором ${bookingId} успешно подтверждено.`;
    } else {
        messageDiv.textContent = 'Платеж не прошел или был отменен.';
    }
});

