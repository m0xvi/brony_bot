document.addEventListener('DOMContentLoaded', function () {
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type');

    const bedsContainer = document.getElementById('beds-container');
    const loungersContainer = document.getElementById('loungers-container');
    const childrenCheckbox = document.getElementById('children-checkbox');
    const childrenControls = document.getElementById('children-controls');
    const arrivalDateSelect = document.getElementById('arrival-date');
    const child = document.getElementById('child');

    childrenCheckbox.addEventListener('change', function () {
        if (childrenCheckbox.checked) {
            childrenControls.style.display = 'block';
            setTimeout(() => {
                childrenControls.classList.add('show');
                child.style.marginBottom = '45px';
            }, 10);
        } else {
            childrenControls.classList.remove('show');
            setTimeout(() => {
                childrenControls.style.display = 'none';
                child.style.marginBottom = '10px';
            }, 100);
        }
        updateTotalPrice();
    });

    const phoneInput = document.getElementById('phone');
    IMask(phoneInput, {
        mask: '+{7}(000)000-00-00'
    });

    if (type === 'bed') {
        loungersContainer.style.display = 'none';
        fetchItemsAndDisplay('bed');
    } else if (type === 'lounger') {
        bedsContainer.style.display = 'none';
        fetchItemsAndDisplay('lounger');
    }

    document.addEventListener('change', function (event) {
        if (event.target.type === 'checkbox' && event.target.id !== 'children-checkbox') {
            updateTotalPrice();
        }
    });

    document.querySelector('.book-btn').addEventListener('click', function (event) {
        event.preventDefault();
        if (validateForm()) {
            submitBookingForm();
        }
    });

    setArrivalDates();
});

function setArrivalDates() {
    const arrivalDateSelect = document.getElementById('arrival-date');
    const today = new Date();
    for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(today.getDate() + i);
        const option = document.createElement('option');
        option.value = date.toISOString().split('T')[0];
        option.textContent = date.toLocaleDateString('ru-RU', {
            weekday: 'long', month: 'long', day: 'numeric'
        });
        arrivalDateSelect.appendChild(option);
    }
    arrivalDateSelect.value = today.toISOString().split('T')[0];
}

function fetchItemsAndDisplay(type) {
    fetch(`http://213.226.126.160:3000/api/get-items?type=${type}`)
        .then(response => response.json())
        .then(items => {
            const container = type === 'bed' ? 'beds-container' : 'loungers-container';
            const itemsContainer = document.getElementById(container);
            itemsContainer.innerHTML = '';
            items.forEach(item => {
                const label = document.createElement('label');
                label.className = `checkbox-container ${type}`;
                label.innerHTML = `
                    <div class="item">
                        <input type="checkbox" id="item-${item.item_id}" name="selectedItems[]" value="${item.item_id}" data-price="${item.price || 0}" ${item.is_booked_today ? 'disabled' : ''}>
                        <span class="checkmark"></span>
                    </div>
                `;

                if (item.is_booked_today) {
                    label.style.color = 'white';
                }

                itemsContainer.appendChild(label);
            });
        })
        .catch(error => console.error('Failed to load items:', error));
}

function updateTotalPrice() {
    const checkboxes = document.querySelectorAll('input[type="checkbox"]:not(:disabled):checked');
    let total = 0;
    checkboxes.forEach(box => {
        total += parseFloat(box.dataset.price) || 0;
    });

    const childrenCheckbox = document.getElementById('children-checkbox');
    if (childrenCheckbox && childrenCheckbox.checked) {
        const childrenCount = parseInt(document.getElementById('children').value, 10) || 0;
        const childPrice = childrenCount * 500;
        total += childPrice;
    }

    document.getElementById('totalPrice').textContent = total;
    return total;
}

function validateForm() {
    let isValid = true;
    ['name', 'phone', 'arrival-date'].forEach(id => {
        const input = document.getElementById(id);
        if (!input.value.trim()) {
            input.classList.add('error');
            isValid = false;
        } else {
            input.classList.remove('error');
        }
    });
    return isValid;
}

function submitBookingForm() {
    const selectedItems = Array.from(document.querySelectorAll('input[type="checkbox"]:checked'))
        .map(box => parseInt(box.value, 10))
        .filter(value => !isNaN(value));

    const formData = {
        name: document.getElementById('name').value,
        phone: document.getElementById('phone').value,
        arrivalDate: document.getElementById('arrival-date').value,
        arrivalTime: document.getElementById('arrival-time').value,
        items: selectedItems,
        children: document.getElementById('children-checkbox').checked ? parseInt(document.getElementById('children').value, 10) || 0 : 0,
        comments: document.getElementById('comments').value,
        totalPrice: updateTotalPrice()
    };

    console.log('Submitting booking with data:', formData);

    fetch('http://213.226.126.160:3000/api/book', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
    })
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => { throw new Error(text) });
            }
            return response.json();
        })
        .then(data => {
            // Сохранение данных бронирования в локальное хранилище для отображения на странице подтверждения
            localStorage.setItem('bookingConfirmation', JSON.stringify(data));
            window.location.href = 'confirmation.html';
        })
        .catch(error => {
            console.error('Error submitting booking:', error);
            alert(`Error submitting booking: ${error.message}`);
        });
}

function increaseCount(id) {
    const input = document.getElementById(id);
    if (input) {
        let currentValue = parseInt(input.value, 10);
        if (currentValue < parseInt(input.max, 10)) {
            input.value = currentValue + 1;
            updateTotalPrice();
        }
    }
}

function decreaseCount(id) {
    const input = document.getElementById(id);
    if (input) {
        let currentValue = parseInt(input.value, 10);
        if (currentValue > parseInt(input.min, 10)) {
            input.value = currentValue - 1;
            updateTotalPrice();
        }
    }
}
