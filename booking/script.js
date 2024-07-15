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
    let timeoutId;

    document.getElementById('book-button').addEventListener('click', async function (event) {
        event.preventDefault();
        const bookButton = document.getElementById('book-button');
        bookButton.disabled = true;

        if (validateAll()) {
            const selectedItems = Array.from(document.querySelectorAll('input[name="selectedItems[]"]:checked'))
                .map(box => parseInt(box.value, 10))
                .filter(value => !isNaN(value));

            const bookingId = uuidv4();
            const formData = {
                name: document.getElementById('name').value,
                phone: document.getElementById('phone').value,
                email: document.getElementById('email').value,
                arrivalDate: document.getElementById('arrival-date').value,
                items: selectedItems,
                children: document.getElementById('children-checkbox').checked ? parseInt(document.getElementById('children').value, 5) || 0 : 0,
                comments: document.getElementById('comments').value,
                totalPrice: updateTotalPrice(),
                bookingId: bookingId
            };


            localStorage.setItem('bookingData', JSON.stringify(formData));
            localStorage.setItem('bookingId', bookingId);

            localStorage.setItem('paymentCompleted', 'false');
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
                if (!paymentResponse.ok) {
                    throw new Error(paymentData.error || 'Ошибка создания платежа');
                }

                const timeoutId = setTimeout(() => {
                    if (localStorage.getItem('paymentCompleted') !== 'true') {
                        console.log(`Время ожидания истекло для бронирования ID: ${bookingId}. Перезагрузка страницы.`);
                        alert('Время ожидания оплаты истекло. Пожалуйста, попробуйте снова.');
                        window.location.reload();
                    } else {
                        console.log(`Оплата завершена для бронирования ID: ${bookingId}, перезагрузка страницы не требуется.`);
                    }
                }, 600000);


                const confirmationToken = paymentData.confirmation_token;
                if (!confirmationToken) {
                    throw new Error('Confirmation token is missing');
                }


                checkout = new window.YooMoneyCheckoutWidget({
                    confirmation_token: confirmationToken,
                    return_url: `https://pool.hotelusadba.ru/booking/confirmation.html?status=succeeded&bookingId=${bookingId}`,
                    error_callback: function (error) {
                        console.error('Error:', error);
                        alert('Произошла ошибка при создании платежа');
                        bookButton.disabled = false;
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
                        bookButton.disabled = false;
                    }
                });

                window.addEventListener('beforeunload', handleBeforeUnload);
                window.addEventListener('unload', handleUnload);

            } catch (error) {
                console.error('Ошибка:', error);
                alert(`Произошла ошибка: ${error.message}`);
                bookButton.disabled = false;
            }

            function handleBeforeUnload(event) {
                const bookingId = localStorage.getItem('bookingId');
                if (bookingId && localStorage.getItem('paymentCompleted') !== 'true') {
                    // event.returnValue = 'У вас есть незавершенное бронирование. Вы уверены, что хотите покинуть страницу?';
                    cancelBooking(bookingId);
                    clearTimeout(timeoutId);
                }
            }

            function handleUnload() {
                const bookingId = localStorage.getItem('bookingId');
                if (bookingId && localStorage.getItem('paymentCompleted') !== 'true') {
                    cancelBooking(bookingId);
                }
            }

        } else {
            bookButton.disabled = false; // Включаем кнопку если валидация не пройдена
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
        const childPrice = childrenCount * 1000;
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



