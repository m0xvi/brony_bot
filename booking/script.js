document.addEventListener('DOMContentLoaded', function () {
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type');

    const bedsContainer = document.getElementById('beds-container');
    const loungersContainer = document.getElementById('loungers-container');
    const childrenCheckbox = document.getElementById('children-checkbox');
    const childrenControls = document.getElementById('children-controls');
    const arrivalDateInput = document.getElementById('arrival-date');
    const child = document.getElementById('child');
    const itemsContainers = document.querySelectorAll('.items-container');

    itemsContainers.forEach(container => container.style.display = 'none');

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

    const emailInput = document.getElementById('email');
    IMask(emailInput, {
        mask: /^\S*@?\S*$/
    });

    arrivalDateInput.addEventListener('change', function () {
        if (type) {
            fetchItemsAndDisplay(type, arrivalDateInput.value);
            if (type === 'bed') {
                bedsContainer.style.display = 'flex';
                loungersContainer.style.display = 'none';
            } else {
                bedsContainer.style.display = 'none';
                loungersContainer.style.display = 'flex';
            }
        }
    });

    if (type) {
        populateDateOptions();
        if (type === 'bed') {
            bedsContainer.style.display = 'flex';
            loungersContainer.style.display = 'none';
        } else {
            bedsContainer.style.display = 'none';
            loungersContainer.style.display = 'flex';
        }

        const today = new Date().toISOString().split('T')[0];
        document.getElementById('arrival-date').value = today;
        fetchItemsAndDisplay(type, today);
    }

    const {v4: uuidv4} = uuid;

    let checkout;

    document.getElementById('book-button').addEventListener('click', async function (event) {
        event.preventDefault();
        if (validateAll()) {
            const selectedItems = Array.from(document.querySelectorAll('input[name="selectedItems[]"]:checked'))
                .map(box => parseInt(box.value, 10))
                .filter(value => !isNaN(value));

            // Генерируем новый bookingId для каждого бронирования
            const bookingId = uuidv4();

            const formData = {
                name: document.getElementById('name').value,
                phone: document.getElementById('phone').value,
                email: document.getElementById('email').value,
                arrivalDate: document.getElementById('arrival-date').value,
                items: selectedItems,
                children: document.getElementById('children-checkbox').checked ? parseInt(document.getElementById('children').value, 10) || 0 : 0,
                comments: document.getElementById('comments').value,
                totalPrice: updateTotalPrice(),
                bookingId: bookingId
            };

            console.log('Данные формы для бронирования:', formData);

            localStorage.setItem('bookingData', JSON.stringify(formData));
            localStorage.setItem('bookingId', bookingId);

            document.getElementById('booking-id').value = bookingId;

            try {
                const bookingResponse = await fetch('/api/book', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData)
                });

                if (!bookingResponse.ok) {
                    throw new Error('Ошибка создания бронирования');
                }

                const paymentResponse = await fetch('/api/create-payment', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        totalPrice: formData.totalPrice,
                        email: formData.email,
                        bookingId: formData.bookingId
                    })
                });

                const paymentData = await paymentResponse.json();
                console.log('Ответ от create-payment:', paymentData);

                if (!paymentResponse.ok) {
                    throw new Error(paymentData.error || 'Ошибка создания платежа');
                }

                setTimeout(() => {
                    if (!localStorage.getItem('paymentCompleted')) {
                        fetch(`/api/cancel-booking/${bookingId}`, {
                            method: 'DELETE'
                        }).then(() => {
                            localStorage.removeItem('bookingId');
                            alert('Бронь была удалена из-за неоплаты в течение 10 минут.');
                            window.location.reload();
                        });
                    }
                }, 600000);

                const confirmationToken = paymentData.confirmation_token;
                if (!confirmationToken) {
                    throw new Error('Confirmation token is missing');
                }

                console.log(`Получен confirmation_token: ${confirmationToken}`);

                checkout = new window.YooMoneyCheckoutWidget({
                    confirmation_token: confirmationToken,
                    return_url: `https://pool.hotelusadba.ru/booking/confirmation.html?status=succeeded&bookingId=${bookingId}`,
                    error_callback: function (error) {
                        console.error('Error:', error);
                        alert('Произошла ошибка при создании платежа');
                    }
                });

                const paymentFormContainer = document.getElementById('payment-form-container');
                paymentFormContainer.style.display = 'flex';
                checkout.render('payment-form');


                document.getElementById('closeBtn').addEventListener('click', function () {
                    if (checkout) {
                        checkout.destroy();
                        paymentFormContainer.style.display = 'none';
                        cancelBooking(bookingId);
                    }
                });
            } catch (error) {
                console.error('Ошибка:', error);
                alert(`Произошла ошибка: ${error.message}`);
            }
        }
    });

    async function cancelBooking(bookingId) {
        try {
            const response = await fetch(`/api/cancel-payment-book/${bookingId}`, {
                method: 'DELETE'
            });
            if (!response.ok) {
                throw new Error('Ошибка удаления временного бронирования');
            }
            console.log('Временное бронирование удалено');
            localStorage.removeItem('bookingId');
        } catch (error) {
            console.error('Ошибка при удалении временного бронирования:', error);
        }
    }
});


function populateDateOptions() {
    const arrivalDateInput = document.getElementById('arrival-date');
    arrivalDateInput.innerHTML = '';
    const today = new Date();
    for (let i = 0; i < 7; i++) {
        const optionDate = new Date(today);
        optionDate.setDate(today.getDate() + i);
        const dayOfWeek = optionDate.toLocaleDateString('ru-RU', {weekday: 'long'});
        const formattedDate = optionDate.toISOString().split('T')[0];
        const option = document.createElement('option');
        option.value = formattedDate;
        option.text = `${dayOfWeek} ${optionDate.getDate()} ${optionDate.toLocaleDateString('ru-RU', {month: 'long'})}`;
        arrivalDateInput.appendChild(option);
    }
}

function fetchItemsAndDisplay(type, date) {
    if (!date || !type) {
        console.error('Invalid date or type');
        return;
    }

    fetch(`/api/get-items?type=${type}&date=${date}`)
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

            document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                checkbox.addEventListener('change', updateTotalPrice);
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

function validateAll() {
    let isValid = true;

    ['name', 'phone', 'arrival-date', 'email'].forEach(id => {
        const input = document.getElementById(id);
        if (!input.value.trim()) {
            input.classList.add('error');
            isValid = false;
        } else {
            input.classList.remove('error');
        }
    });

    const emailInput = document.getElementById('email');
    if (!validateEmail(emailInput.value)) {
        emailInput.classList.add('error');
        isValid = false;
    } else {
        emailInput.classList.remove('error');
    }


    const checkboxes = document.querySelectorAll('input[name="selectedItems[]"]:checked');
    const bedsContainer = document.getElementById('beds-container');
    const loungersContainer = document.getElementById('loungers-container');
    if (checkboxes.length === 0) {
        bedsContainer.classList.add('error');
        loungersContainer.classList.add('error');
        isValid = false;
    } else {
        bedsContainer.classList.remove('error');
        loungersContainer.classList.remove('error');
    }

    const policyCheckbox = document.getElementById('policy-checkbox');
    const rulesCheckbox = document.getElementById('rules-checkbox');
    const policyContainer = policyCheckbox.closest('.policy');
    const rulesContainer = rulesCheckbox.closest('.rules');

    if (!policyCheckbox.checked) {
        policyContainer.classList.add('error');
        isValid = false;
    } else {
        policyContainer.classList.remove('error');
    }

    if (!rulesCheckbox.checked) {
        rulesContainer.classList.add('error');
        isValid = false;
    } else {
        rulesContainer.classList.remove('error');
    }

    return isValid;
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
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
