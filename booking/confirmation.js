document.addEventListener('DOMContentLoaded', function () {
    const params = new URLSearchParams(window.location.search);
    const bookingId = params.get('bookingId'); // Ensure this matches with the parameter in the URL

    if (!bookingId) {
        document.querySelector('.confirmation-details').innerHTML = '<p>Идентификатор бронирования не найден.</p>';
        return;
    }

    fetch(`/api/booking/${bookingId}`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                document.querySelector('.confirmation-details').innerHTML = '<p>Ошибка: ' + data.error + '</p>';
                return;
            }

            document.querySelector('#booking_id').textContent = data.booking_id;
            document.querySelector('#arrival_date').textContent = new Date(data.arrival_date).toLocaleDateString();
            document.querySelector('#beds').textContent = data.beds ? data.beds.split(',').map(id => `Кровать ID: ${id}`).join(', ') : 'Нет';
            document.querySelector('#loungers').textContent = data.loungers ? data.loungers.split(',').map(id => `Шезлонг ID: ${id}`).join(', ') : 'Нет';
        })
        .catch(error => {
            console.error('Error fetching booking:', error);
            document.querySelector('.confirmation-details').innerHTML = '<p>Ошибка загрузки данных бронирования.</p>';
        });
});
