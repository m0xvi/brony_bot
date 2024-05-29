function authenticate() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    fetch('http://213.226.126.160:3000/api/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({username, password})
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                localStorage.setItem('isAuthenticated', 'true');
                document.getElementById('auth-form').style.display = 'none';
                document.getElementById('admin-container').style.display = 'flex';
                fetchBookings();
                fetchItems();
                document.getElementById('item-type').addEventListener('change', fetchItems);
                document.getElementById('booking-date').addEventListener('change', fetchItems);
            } else {
                alert('Неверный логин или пароль');
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
}