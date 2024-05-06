document.addEventListener('DOMContentLoaded', function() {
    const bedsInput = document.getElementById('beds');
    const loungersInput = document.getElementById('loungers');
    const childCheckbox = document.getElementById('child');
    const totalPriceElement = document.getElementById('totalPrice');
    const phoneInput = document.getElementById('phone');
    const commentsInput = document.getElementById('comments');

    function updateTotalPrice() {
        const beds = parseInt(bedsInput.value) || 0;
        const loungers = parseInt(loungersInput.value) || 0;
        const child = childCheckbox.checked ? 500 : 0;
        const total = (beds * 4000) + (loungers * 2000) + child;
        totalPriceElement.textContent = total;
    }

    // Add event listeners
    bedsInput.addEventListener('change', updateTotalPrice);
    loungersInput.addEventListener('change', updateTotalPrice);
    childCheckbox.addEventListener('change', updateTotalPrice);
    phoneInput.addEventListener('change', updateTotalPrice);
    commentsInput.addEventListener('change', updateTotalPrice);
    document.querySelector('.book-btn').addEventListener('click', confirmBooking);

    updateTotalPrice(); // Initialize total at load

    function confirmBooking() {
        const confirmation = document.querySelector('.confirmation');
        confirmation.classList.remove('hidden');
        confirmation.scrollIntoView();
    }
});

