// hashPassword.js
const bcrypt = require('bcrypt');

const saltRounds = 10;
const plainPassword = 'gUbkaB0bik';

bcrypt.hash(plainPassword, saltRounds, function(err, hash) {
    if (err) {
        console.error('Error hashing password:', err);
    } else {
        console.log('Hashed password:', hash);
    }
});
