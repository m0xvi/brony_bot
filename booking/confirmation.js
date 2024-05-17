document.addEventListener('DOMContentLoaded', function () {
    const confirmationData = JSON.parse(localStorage.getItem('bookingConfirmation'));

    if (confirmationData) {
        const detailsContainer = document.getElementById('confirmation-details');
        const bookingIdContainer = document.getElementById('booking-id');

        detailsContainer.innerHTML = `
            <p>Вы забронировали ${confirmationData.items.length} ${confirmationData.items.length > 1 ? 'кровати' : 'кровать'}. <br> Дата: ${confirmationData.arrivalDate}. <br> Время: ${confirmationData.arrivalTime}.</p>
        `;
        
        bookingIdContainer.innerHTML = `
            <p>Ваш идентификатор: <br> ${confirmationData.bookingId}</p>
        `;
    } else {
        detailsContainer.innerHTML = '<p>Информация о бронировании недоступна.</p>';
    }
});

function goHome() {
    window.location.href = 'index.html';
}
