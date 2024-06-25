function fetchItems() {
    const itemType = document.getElementById('item-type').value;
    const bookingDate = document.getElementById('booking-date').value;

    if (!bookingDate || !itemType) {
        console.error('Invalid date or type');
        return;
    }

    fetch(`/api/get-items?type=${itemType}&date=${bookingDate}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(items => {
            const bedsContainer = document.getElementById('beds-container');
            const loungersContainer = document.getElementById('loungers-container');

            bedsContainer.innerHTML = '';
            loungersContainer.innerHTML = '';

            if (itemType === 'bed') {
                loungersContainer.style.display = 'none';
                bedsContainer.style.display = 'flex';
                bedsContainer.style.flexWrap = 'wrap';
            } else {
                bedsContainer.style.display = 'none';
                loungersContainer.style.display = 'flex';
                loungersContainer.style.flexWrap = 'wrap';
            }

            const itemsContainer = itemType === 'bed' ? bedsContainer : loungersContainer;
            items.forEach((item, index) => {
                const label = document.createElement('label');
                label.className = `checkbox-container ${itemType}`;
                label.innerHTML = `
                    <input type="checkbox" data-id="${item.item_id}" ${item.is_booked_today ? 'checked' : ''}>
                    <span class="checkmark"></span>
                    <div><b>ID:</b> ${item.item_id} <br> ${item.price} ₽</div>
                `;
                itemsContainer.appendChild(label);
            });
        })
        .catch(error => console.error('Failed to load items:', error));
}

function updateItems() {
    const checkboxes = document.querySelectorAll('#beds-container input[type="checkbox"], #loungers-container input[type="checkbox"]');
    const bookingDate = document.getElementById('booking-date').value;
    const items = Array.from(checkboxes).map(checkbox => ({
        item_id: checkbox.getAttribute('data-id'),
        is_booked: checkbox.checked ? 1 : 0,
        booking_date: bookingDate,
        booking_id: checkbox.checked ? generateUUID() : null
    }));

    console.log('Updating items:', items); // Логирование

    fetch('/api/admin/update-items', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({items})
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            alert('Items updated successfully!');
            fetchItems(); // Reload items after update
            fetchBookings(); // Reload bookings after update
        })
        .catch(error => console.error('Error updating items:', error));
}

function fetchBookings() {
    fetch('/api/admin/get-bookings')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(bookings => {
            const bookingsContainer = document.getElementById('bookings-container');
            bookingsContainer.innerHTML = '';

            const bookingsByDate = groupBookingsByDate(bookings);

            for (const [date, dailyBookings] of Object.entries(bookingsByDate)) {
                const dayContainer = document.createElement('div');
                dayContainer.className = 'day-container';
                const dayHead = document.createElement('h3');
                const dayHeader = document.createElement('div');
                dayHeader.className = 'day-header';
                dayHead.textContent = `${formatDate(date)}`;

                dayHeader.style.display = 'grid';
                dayHeader.style.gridTemplateColumns = 'repeat(auto-fill, minmax(30%, 2fr))';

                dayContainer.appendChild(dayHead);
                dayContainer.appendChild(dayHeader);


                dailyBookings.forEach(booking => {
                    const div = document.createElement('div');
                    div.className = 'booking-item';
                    div.innerHTML = `
                        <button class="hide-btn" onclick="hideBooking('${booking.booking_id}')">&times;</button>
                        <p><strong>ID бронирования:</strong> ${booking.booking_id}</p>
                        <p><strong>Имя:</strong> ${booking.name}</p>
                        <p><strong>Email:</strong> ${booking.email}</p>
                        <p><strong>Дата прибытия:</strong> ${new Date(booking.arrival_date).toLocaleDateString()}</p>
                        <p><strong>Время бронирования:</strong> ${new Date(booking.booking_timestamp).toLocaleString()}</p>
                        <p><strong>Телефон:</strong> ${booking.phone}</p>
                        <p><strong>Комментарии:</strong> ${booking.comments}</p>
                        <p><strong>Количество детей:</strong> ${booking.children}</p>
                        <p><strong>Общая цена:</strong> ${booking.total_price} ₽</p>
                        ${booking.beds ? `<p><strong>Кровати:</strong> ${booking.beds.split(',').map(id => `ID: ${id}`).join(', ')}</p>` : ''}
                        ${booking.loungers ? `<p><strong>Шезлонги:</strong> ${booking.loungers.split(',').map(id => `ID: ${id}`).join(', ')}</p>` : ''}
                    `;
                    dayHeader.appendChild(div);
                });

                bookingsContainer.appendChild(dayContainer);
            }
        })
        .catch(error => console.error('Failed to load bookings:', error));
}

function groupBookingsByDate(bookings) {
    return bookings.reduce((acc, booking) => {
        const date = new Date(booking.arrival_date).toLocaleDateString('en-CA'); // Ensure date is correct
        if (!acc[date]) {
            acc[date] = [];
        }
        acc[date].push(booking);
        return acc;
    }, {});
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    });
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}


function removeItem() {
    const itemType = document.getElementById('item-type').value;
    fetch('/api/admin/remove-item', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({item_type: itemType})
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log('Item removed:', data); // Log the server response after removal
            alert('Item removed successfully!');
            fetchItems(); // Reload items after update
        })
        .catch(error => console.error('Error removing item:', error));
}

function resetData() {
    fetch('/api/reset-data', {
        method: 'POST'
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log('Data reset:', data); // Log the server response after reset
            alert('Data reset successfully!');
            fetchItems(); // Reload items after reset
            fetchBookings(); // Reload bookings after reset
        })
        .catch(error => console.error('Error resetting data:', error));
}


function hideBooking(bookingId) {
    fetch(`/api/admin/remove-booking/${bookingId}`, {
        method: 'DELETE'
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log('Booking removed:', data);
            fetchBookings(); // Reload bookings after deletion
        })
        .catch(error => console.error('Error deleting booking:', error));
}


