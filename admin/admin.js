document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('item-type').addEventListener('change', fetchItems);
    document.getElementById('booking-date').addEventListener('change', fetchItems);
    document.getElementById('add-item-btn').addEventListener('click', addItem);
    document.getElementById('remove-item-btn').addEventListener('click', removeItem);
    document.getElementById('update-items-btn').addEventListener('click', updateItems);
    document.getElementById('reset-data-btn').addEventListener('click', resetData);
    fetchBookings(); // Load bookings on page load
    fetchItems(); // Load items on page load

    // Set default date to current
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('booking-date').value = today;
});

function fetchItems() {
    const itemType = document.getElementById('item-type').value;
    const bookingDate = document.getElementById('booking-date').value;

    if (!bookingDate || !itemType) {
        console.error('Invalid date or type');
        return;
    }

    fetch(`http://213.226.126.160:3000/api/get-items?type=${itemType}&date=${bookingDate}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(items => {
            console.log('Items fetched:', items); // Log the fetched items
            const bedsContainer = document.getElementById('beds-container');
            const loungersContainer = document.getElementById('loungers-container');

            bedsContainer.innerHTML = '';
            loungersContainer.innerHTML = '';

            if (itemType === 'bed') {
                loungersContainer.style.display = 'none';
                bedsContainer.style.display = 'flex';
                bedsContainer.style.flexWrap = 'wrap';
                bedsContainer.style.width = '70%';
            } else {
                bedsContainer.style.display = 'none';
                loungersContainer.style.display = 'flex';
                loungersContainer.style.flexWrap = 'wrap';
                loungersContainer.style.width = '70%';
            }

            const itemsContainer = itemType === 'bed' ? bedsContainer : loungersContainer;
            items.forEach(item => {
                const label = document.createElement('label');
                label.className = `checkbox-container ${itemType}`;
                label.innerHTML = `
                    <input type="checkbox" data-id="${item.item_id}" ${item.is_booked_today ? 'checked' : ''}>
                    <span class="checkmark"></span>
                    <div>${item.item_id}</div>
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
        booking_date: checkbox.checked ? bookingDate : null,
        booking_id: checkbox.checked ? generateUUID() : null // generateUUID() is a function to generate UUID
    }));

    fetch('http://213.226.126.160:3000/api/admin/update-items', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items })
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log('Items updated:', data); // Log the server response after update
            alert('Items updated successfully!');
            fetchItems(); // Reload items after update
            fetchBookings(); // Reload bookings after update
        })
        .catch(error => console.error('Error updating items:', error));
}

// Function to generate UUID (can be replaced with a library function if needed)
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function resetData() {
    fetch('http://213.226.126.160:3000/api/reset-data', {
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

function fetchBookings() {
    fetch('http://213.226.126.160:3000/api/get-bookings')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(bookings => {
            const bookingsContainer = document.getElementById('bookings-container');
            bookingsContainer.innerHTML = '';
            bookings.forEach(booking => {
                const div = document.createElement('div');
                div.className = 'booking-item';
                div.innerHTML = `
                    <p><strong>ID бронирования:</strong> ${booking.booking_id}</p>
                    <p><strong>Имя:</strong> ${booking.name}</p>
                    <p><strong>Дата бронирования:</strong> ${booking.arrival_date}</p>
                    <p><strong>Время бронирования:</strong> ${new Date(booking.booking_timestamp).toLocaleString()}</p>
                    <p><strong>Телефон:</strong> ${booking.phone}</p>
                    <p><strong>Комментарии:</strong> ${booking.comments}</p>
                    <p><strong>Общая цена:</strong> ${booking.total_price} ₽</p>
                    <p><strong>Кровати:</strong> ${booking.beds}</p>
                    <p><strong>Шезлонги:</strong> ${booking.loungers}</p>
                `;
                bookingsContainer.appendChild(div);
            });
        })
        .catch(error => console.error('Failed to load bookings:', error));
}

function addItem() {
    const itemType = document.getElementById('item-type').value;
    const price = prompt('Введите цену для нового предмета:');
    if (price === null) return; // User canceled the prompt

    fetch('http://213.226.126.160:3000/api/admin/add-item', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ item_type: itemType, price: parseFloat(price) })
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log('Item added:', data); // Log the server response after addition
            alert('Item added successfully!');
            fetchItems(); // Reload items after update
        })
        .catch(error => console.error('Error adding item:', error));
}

function removeItem() {
    const itemType = document.getElementById('item-type').value;
    fetch('http://213.226.126.160:3000/api/admin/remove-item', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ item_type: itemType })
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
