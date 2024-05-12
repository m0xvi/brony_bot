document.addEventListener('DOMContentLoaded', function () {
    const bedsInput = document.getElementById('beds');
    const loungersInput = document.getElementById('loungers');
    const childrenInput = document.getElementById('children');
    const totalPriceElement = document.getElementById('totalPrice');
    const phoneInput = document.getElementById('phone');
    const nameInput = document.getElementById('name');
    const bedsControl = document.querySelector('.quantity-beds'); // Контейнер для кроватей
    const bedsLabel = document.getElementById('bed-control'); // Заголовок для кроватей
    const loungerControl = document.querySelector('.quantity-loungers'); // Контейнер для шезлонгов
    const loungerLabel = document.getElementById('lounger-control'); // Заголовок для шезлонгов

    // Применение маски ввода к полю телефона
    IMask(phoneInput, {
        mask: '+{7} (000) 000-0000'
    });

    // Считывание параметра типа из URL
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type');

    // Управление отображением элементов в зависимости от типа
    if (type === 'bed') {
        loungerControl.style.display = 'none';
        loungerLabel.style.display = 'none'; // Скрываем заголовок для шезлонгов
    } else if (type === 'lounger') {
        bedsControl.style.display = 'none';
        bedsLabel.style.display = 'none'; // Скрываем заголовок для кроватей
    }


    function increaseCount(id) {
        let element = document.getElementById(id);
        let currentValue = parseInt(element.value);
        if (currentValue < element.max) {
            element.value = currentValue + 1;
        }
        updateTotalPrice();
    }

    function decreaseCount(id) {
        let element = document.getElementById(id);
        let currentValue = parseInt(element.value);
        if (currentValue > element.min) {
            element.value = currentValue - 1;
        }
        updateTotalPrice();
    }

    window.increaseCount = increaseCount;
    window.decreaseCount = decreaseCount;

    function updateTotalPrice() {
        const beds = parseInt(bedsInput.value) || 0;
        const loungers = parseInt(loungersInput.value) || 0;
        const children = parseInt(childrenInput.value) || 0;
        const childPrice = children * 500;
        const total = (beds * 4000) + (loungers * 2000) + childPrice;
        totalPriceElement.textContent = total;
    }

    document.querySelector('.book-btn').addEventListener('click', function (event) {
        let isValid = true;
        const requiredFields = [
            {id: 'name', message: 'Введите ваше имя.'},
            {id: 'arrival-date', message: 'Выберите дату заезда.'},
            {id: 'arrival-time', message: 'Укажите время заезда.'},
            {id: type === 'bed' ? 'beds' : 'loungers', message: 'Укажите количество.'},
            {id: 'phone', message: 'Укажите ваш телефон.'}
        ];

        requiredFields.forEach(field => {
            const input = document.getElementById(field.id);
            const errorDiv = document.getElementById(field.id + '-error');
            if (!input.value.trim()) {
                isValid = false;
                errorDiv.textContent = field.message;
                input.classList.add('error');
            } else {
                errorDiv.textContent = '';
                input.classList.remove('error');
            }
        });

        if (!isValid) {
            event.preventDefault();
        }
    });

    bedsInput.addEventListener('change', updateTotalPrice);
    loungersInput.addEventListener('change', updateTotalPrice);
    childrenInput.addEventListener('change', updateTotalPrice);
    updateTotalPrice();
});

document.querySelector('.book-btn').addEventListener('click', function (event) {
    event.preventDefault();  // Предотвращаем стандартную отправку формы

    const formData = {
        name: document.getElementById('name').value,
        phone: document.getElementById('phone').value,
        arrivalDate: document.getElementById('arrival-date').value,
        arrivalTime: document.getElementById('arrival-time').value,
        beds: document.getElementById('beds').value,
        loungers: document.getElementById('loungers').value,
        children: document.getElementById('children').value,
        comments: document.getElementById('comments').value
    };

    fetch('https://192.168.0.107:3000/book', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
    })
    .then(response => response.json())
    .then(data => console.log('Success:', data))
    .catch((error) => console.error('Error:', error));
});

