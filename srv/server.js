const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
require('dotenv').config();
const YooKassa = require('yookassa');
const multer = require('multer');
const upload = multer();
const nodemailer = require('nodemailer');

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('/var/www/html/booking_pool/booking'));

const transporter = nodemailer.createTransport({
    host: 'smtp.mail.ru', // Замените на ваш SMTP сервер
    port: 587, // Порт вашего SMTP сервера (например, 587 для TLS)
    secure: false, // Установите в true, если вы используете порт 465
    auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASS
    },
    tls: {
        rejectUnauthorized: false, // Временно отключаем проверку сертификатов (убедитесь, что вы используете это только для отладки)
        minVersion: 'TLSv1.2' // Устанавливаем минимальную версию TLS
    },
    logger: true, // Включаем логирование
    debug: true // Включаем отладочный режим
}, {
    from: process.env.SMTP_EMAIL // Ваш email по умолчанию
});

transporter.verify(function (error, success) {
    if (error) {
        console.error('SMTP connection error:', error);
    } else {
        console.log('SMTP server is ready to take our messages:', success);
    }
});

const yookassa = new YooKassa({
    shopId: process.env.YOOKASSA_SHOP_ID,
    secretKey: process.env.YOOKASSA_SECRET_KEY
});

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL');
});

function readHtmlTemplate(filePath, callback) {
    fs.readFile(filePath, 'utf8', callback);
}

function inlineCss(html, css) {
    const styleTag = `<style>${css}</style>`;
    return html.replace('</head>', `${styleTag}</head>`);
}

function populateTemplate(html, data) {
    return html
        .replace('{{booking_id}}', data.booking_id)
        .replace('{{arrival_date}}', new Date(data.arrival_date).toLocaleDateString())
        .replace('{{beds}}', data.beds ? data.beds.split(',').map(id => `Кровать ID: ${id}`).join(', ') : 'Нет')
        .replace('{{loungers}}', data.loungers ? data.loungers.split(',').map(id => `Шезлонг ID: ${id}`).join(', ') : 'Нет');
}

function sendConfirmationEmail(email, bookingId, bookingData) {
    readHtmlTemplate('/var/www/html/booking_pool/booking/confirmation.html', (err, html) => {
        if (err) {
            return console.error('Ошибка чтения HTML-шаблона:', err);
        }

        const renderedHtml = populateTemplate(html, bookingData);

        const mailOptions = {
            from: process.env.SMTP_EMAIL,
            to: email,
            subject: 'Подтверждение бронирования',
            html: renderedHtml
        };

        console.log('Отправка письма на:', email);
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                return console.error('Ошибка отправки письма:', error);
            }
            console.log('Письмо отправлено:', info.response);
        });
    });
}



function sendBookingDetailsToReception(bookingData) {
    const receptionEmail = 'pool@hotelusadba.ru';
    const subject = `Новое бронирование №${bookingData.booking_id}`;
    const htmlContent = `
        <div class="confirmation-details">
            <h3>Новое бронирование</h3>
            <div class="details">
                <p>Бронирование №: ${bookingData.booking_id}</p>
                <p>Имя: ${bookingData.name}</p>
                <p>Email: ${bookingData.email}</p>
                <p>Телефон: ${bookingData.phone}</p>
                <p>Дата прибытия: ${new Date(bookingData.arrival_date).toLocaleDateString()}</p>
                <p>Время бронирования: ${new Date(bookingData.booking_timestamp).toLocaleString()}</p>
                <p>Комментарии: ${bookingData.comments}</p>
                <p>Общая цена: ${bookingData.total_price} ₽</p>
                <p>Кровати: ${bookingData.beds ? bookingData.beds.split(',').map(id => `Кровать ID: ${id}`).join(', ') : 'Нет'}</p>
                <p>Шезлонги: ${bookingData.loungers ? bookingData.loungers.split(',').map(id => `Шезлонг ID: ${id}`).join(', ') : 'Нет'}</p>
            </div>
        </div>
    `;

    const mailOptions = {
        from: process.env.SMTP_EMAIL,
        to: receptionEmail,
        subject: subject,
        html: htmlContent
    };

    console.log('Отправка письма на рецепцию:', receptionEmail);
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return console.error('Ошибка отправки письма на рецепцию:', error);
        }
        console.log('Письмо на рецепцию отправлено:', info.response);
    });
}


app.post('/api/payment-webhook', async (req, res) => {
    console.log('Получен вебхук:', req.body);

    const { object } = req.body;

    if (object && object.status === 'succeeded') {
        const paymentId = object.id;
        const bookingId = object.description.split('№')[1].trim();
        const email = object.receipt.customer.email;

        console.log(`Оплата успешна для бронирования ID: ${bookingId}`);

        const sql = `
            SELECT b.booking_id,
                   b.arrival_date,
                   b.phone,
                   b.comments,
                   b.total_price,
                   b.booking_timestamp,
                   GROUP_CONCAT(CASE WHEN i.item_type = 'bed' THEN bi.item_id END)     AS beds,
                   GROUP_CONCAT(CASE WHEN i.item_type = 'lounger' THEN bi.item_id END) AS loungers
            FROM bookings b
                     LEFT JOIN item_bookings bi ON b.booking_id = bi.booking_id
                     LEFT JOIN item_status i ON bi.item_id = i.item_id
            WHERE b.booking_id = ?
            GROUP BY b.booking_id
        `;

        db.query(sql, [bookingId], (err, result) => {
            if (err) {
                console.error('Ошибка получения бронирования:', err);
                return res.status(500).json({ error: 'Ошибка получения бронирования из базы данных' });
            } else if (result.length === 0) {
                return res.status(404).json({ error: 'Бронирование не найдено' });
            } else {
                const bookingData = result[0];
                sendConfirmationEmail(email, bookingId, bookingData);
                sendBookingDetailsToReception(bookingData);
                res.status(200).send('OK');
            }
        });
    } else {
        console.log('Необработанный статус оплаты:', object.status);
        res.status(200).send('Статус оплаты не обработан');
    }
});



async function checkPaymentStatus(paymentId, bookingId, email) {
    try {
        const payment = await yookassa.getPayment(paymentId);
        if (payment.status === 'succeeded') {
            console.log(`Payment status: succeeded for booking ID: ${bookingId}`);
            const sql = `
                SELECT b.booking_id,
                       b.arrival_date,
                       b.phone,
                       b.comments,
                       b.total_price,
                       b.booking_timestamp,
                       GROUP_CONCAT(CASE WHEN i.item_type = 'bed' THEN bi.item_id END)     AS beds,
                       GROUP_CONCAT(CASE WHEN i.item_type = 'lounger' THEN bi.item_id END) AS loungers
                FROM bookings b
                         LEFT JOIN item_bookings bi ON b.booking_id = bi.booking_id
                         LEFT JOIN item_status i ON bi.item_id = i.item_id
                WHERE b.booking_id = ?
                GROUP BY b.booking_id
            `;

            db.query(sql, [bookingId], (err, result) => {
                if (err) {
                    console.error('Error fetching booking:', err);
                } else if (result.length === 0) {
                    console.error('Booking not found');
                } else {
                    const bookingData = result[0];
                    sendConfirmationEmail(email, bookingId, bookingData);
                    sendBookingDetailsToReception(bookingData);
                }
            });
        } else if (payment.status === 'pending') {
            console.log(`Payment status: still pending for booking ID: ${bookingId}`);
            setTimeout(() => checkPaymentStatus(paymentId, bookingId, email), 60000);
        } else {
            console.log(`Payment status: ${payment.status} for booking ID: ${bookingId}`);
        }
    } catch (error) {
        console.error('Error checking payment status:', error);
    }
}

app.post('/api/create-payment', async (req, res) => {
    const { totalPrice, bookingId, email } = req.body;

    console.log('Создание платежа с параметрами:', { totalPrice, bookingId, email });

    try {
        const payment = await yookassa.createPayment({
            amount: {
                value: totalPrice.toFixed(2),
                currency: 'RUB'
            },
            confirmation: {
                type: 'embedded'
            },
            capture: true,
            description: `Оплата бронирования №${bookingId}`,
            receipt: {
                customer: {
                    email: email
                },
                items: [
                    {
                        description: `Бронирование №${bookingId}`,
                        quantity: 1,
                        amount: {
                            value: totalPrice.toFixed(2),
                            currency: 'RUB'
                        },
                        vat_code: 1,
                        payment_mode: "full_payment",
                        payment_subject: "service"
                    }
                ]
            }
        });

        if (!payment.confirmation || !payment.confirmation.confirmation_token) {
            throw new Error('Failed to create payment: confirmation_token is missing');
        }

        console.log(`Payment created with status: ${payment.status}`);
        console.log(`Payment ID: ${payment.id}`);
        console.log(`Confirmation token: ${payment.confirmation.confirmation_token}`);

        checkPaymentStatus(payment.id, bookingId, email);

        res.json({ confirmation_token: payment.confirmation.confirmation_token, bookingId });
    } catch (error) {
        console.error('Error creating payment:', error);
        res.status(500).json({ error: error.message });
    }
});










app.get('/api/booking/:paymentId', (req, res) => {
    const paymentId = req.params.paymentId;

    const sql = `
        SELECT b.booking_id,
               b.arrival_date,
               b.phone,
               b.comments,
               b.total_price,
               b.booking_timestamp,
               GROUP_CONCAT(CASE WHEN i.item_type = 'bed' THEN bi.item_id END)     AS beds,
               GROUP_CONCAT(CASE WHEN i.item_type = 'lounger' THEN bi.item_id END) AS loungers
        FROM bookings b
                 LEFT JOIN item_bookings bi ON b.booking_id = bi.booking_id
                 LEFT JOIN item_status i ON bi.item_id = i.item_id
        WHERE b.booking_id = ?
        GROUP BY b.booking_id
    `;

    db.query(sql, [paymentId], (err, result) => {
        if (err) {
            console.error('Error fetching booking:', err);
            res.status(500).json({ error: 'Error fetching booking from database' });
        } else if (result.length === 0) {
            res.status(404).json({ error: 'Booking not found' });
        } else {
            res.json(result[0]);
        }
    });
});

app.post('/api/reset-data', (req, res) => {
    const resetItemStatus = "UPDATE item_status SET is_booked = 0, booking_date = NULL";
    const clearBookings = "DELETE FROM bookings";
    const clearBookingItems = "DELETE FROM item_bookings";
    const clearBookingHistory = "DELETE FROM booking_history";

    db.beginTransaction(err => {
        if (err) {
            console.error('Error starting transaction', err);
            return res.status(500).json({ error: 'Error starting transaction' });
        }

        db.query(resetItemStatus, (err, result) => {
            if (err) {
                console.error('Error resetting item status', err);
                return db.rollback(() => {
                    res.status(500).json({ error: 'Error resetting item status' });
                });
            }

            db.query(clearBookingItems, (err, result) => {
                if (err) {
                    console.error('Error clearing booking items', err);
                    return db.rollback(() => {
                        res.status(500).json({ error: 'Error clearing booking items' });
                    });
                }

                db.query(clearBookings, (err, result) => {
                    if (err) {
                        console.error('Error clearing bookings', err);
                        return db.rollback(() => {
                            res.status(500).json({ error: 'Error clearing bookings' });
                        });
                    }

                    db.query(clearBookingHistory, (err, result) => {
                        if (err) {
                            console.error('Error clearing booking history', err);
                            return db.rollback(() => {
                                res.status(500).json({ error: 'Error clearing booking history' });
                            });
                        }

                        db.commit(err => {
                            if (err) {
                                console.error('Error committing transaction', err);
                                return db.rollback(() => {
                                    res.status(500).json({ error: 'Error committing transaction' });
                                });
                            }
                            res.json({ message: 'Data reset successfully' });
                        });
                    });
                });
            });
        });
    });
});

app.get('/api/get-items', (req, res) => {
    const type = req.query.type;
    const date = req.query.date || new Date().toISOString().split('T')[0]; // Default to today's date

    if (!date || !type) {
        return res.status(400).json({ error: 'Invalid date or type' });
    }

    const sql = `
        SELECT item_id,
               item_type,
               price,
               CASE
                   WHEN EXISTS (SELECT 1
                                FROM item_bookings
                                WHERE item_id = item_status.item_id
                                  AND booking_date = ?) THEN TRUE
                   ELSE FALSE
                   END AS is_booked_today
        FROM item_status
        WHERE item_type = ?
    `;
    db.query(sql, [date, type], (err, result) => {
        if (err) {
            console.error('Error fetching items:', err);
            res.status(500).json({ error: 'Error fetching items from database' });
        } else {
            res.json(result);
        }
    });
});

app.get('/api/get-bookings', (req, res) => {
    const sql = `
        SELECT b.booking_id,
               b.name,
               b.arrival_date,
               b.children,
               b.phone,
               b.email,
               b.comments,
               b.total_price,
               b.booking_timestamp,
               GROUP_CONCAT(CASE WHEN i.item_type = 'bed' THEN bi.item_id END)     AS beds,
               GROUP_CONCAT(CASE WHEN i.item_type = 'lounger' THEN bi.item_id END) AS loungers
        FROM bookings b
                 LEFT JOIN item_bookings bi ON b.booking_id = bi.booking_id
                 LEFT JOIN item_status i ON bi.item_id = i.item_id
        GROUP BY b.booking_id
        ORDER BY b.booking_timestamp DESC
    `;
    db.query(sql, (err, result) => {
        if (err) {
            console.error('Error fetching bookings:', err);
            res.status(500).json({ error: 'Error fetching bookings from database' });
        } else {
            res.json(result);
        }
    });
});

app.post('/api/admin/update-items', (req, res) => {
    const items = req.body.items;
    const sqlUpdateItemStatus = "UPDATE item_status SET is_booked = ?, booking_date = ? WHERE item_id = ?";
    const sqlInsertBooking = "INSERT INTO bookings (booking_id, name, arrival_date, children, phone, email, comments, total_price, booking_timestamp) VALUES (?, 'Администратор', ?, 0, 'N/A', 'N/A', 'Администратор изменил статус', 0, NOW())";
    const sqlInsertItemBooking = "INSERT INTO item_bookings (item_id, booking_id, booking_date) VALUES (?, ?, ?)";
    const sqlDeleteItemBooking = "DELETE FROM item_bookings WHERE item_id = ? AND booking_date = ?";

    db.beginTransaction(err => {
        if (err) {
            console.error('Error starting transaction', err);
            return res.status(500).json({ error: 'Error starting transaction' });
        }

        const updatePromises = items.map(item => {
            const bookingDate = item.booking_date ? new Date(item.booking_date).toISOString().slice(0, 19).replace('T', ' ') : null;
            if (item.is_booked === 1) {
                return new Promise((resolve, reject) => {
                    const newBookingId = uuidv4();
                    db.query(sqlInsertBooking, [newBookingId, bookingDate], (err, result) => {
                        if (err) {
                            console.error('Error inserting admin booking', err);
                            return reject(err);
                        }
                        db.query(sqlInsertItemBooking, [item.item_id, newBookingId, bookingDate], (err, result) => {
                            if (err) {
                                console.error('Error inserting item booking', err);
                                return reject(err);
                            }
                            resolve(result);
                        });
                    });
                });
            } else {
                return new Promise((resolve, reject) => {
                    db.query(sqlDeleteItemBooking, [item.item_id, bookingDate], (err, result) => {
                        if (err) {
                            console.error('Error deleting item booking', err);
                            return reject(err);
                        }
                        resolve(result);
                    });
                });
            }
        });

        Promise.all(updatePromises)
            .then(results => {
                db.commit(err => {
                    if (err) {
                        console.error('Error committing transaction', err);
                        return db.rollback(() => {
                            res.status(500).json({ error: 'Error committing transaction' });
                        });
                    }
                    res.json({ message: 'Items updated successfully' });
                });
            })
            .catch(err => {
                db.rollback(() => {
                    res.status(500).json({ error: 'Error updating items' });
                });
            });
    });
});

app.post('/api/admin/add-item', (req, res) => {
    const { item_type, price } = req.body;
    const sql = "INSERT INTO item_status (item_type, price, is_booked) VALUES (?, ?, 0)";

    db.query(sql, [item_type, price], (err, result) => {
        if (err) {
            console.error('Error adding item:', err);
            res.status(500).json({ error: 'Error adding item to database' });
        } else {
            res.json({ message: 'Item added successfully', itemId: result.insertId });
        }
    });
});

app.post('/api/admin/remove-item', (req, res) => {
    const { item_type } = req.body;
    const sql = `
        DELETE
        FROM item_status
        WHERE item_type = ?
          AND item_id = (SELECT item_id
                         FROM (SELECT item_id
                               FROM item_status
                               WHERE item_type = ?
                               ORDER BY item_id DESC LIMIT 1) as temp)
    `;

    db.query(sql, [item_type, item_type], (err, result) => {
        if (err) {
            console.error('Error removing item:', err);
            res.status(500).json({ error: 'Error removing item from database' });
        } else {
            res.json({ message: 'Item removed successfully' });
        }
    });
});

app.get('/privacy-policy', (req, res) => {
    res.sendFile(path.join(__dirname, 'privacy-policy.html'));
});

app.delete('/api/cancel-booking/:bookingId', (req, res) => {
    const bookingId = req.params.bookingId;

    const sqlDeleteBooking = "DELETE FROM bookings WHERE booking_id = ?";
    const sqlDeleteItemBooking = "DELETE FROM item_bookings WHERE booking_id = ?";
    const sqlUpdateItems = "UPDATE item_status SET is_booked = FALSE WHERE item_id IN (SELECT item_id FROM item_bookings WHERE booking_id = ?)";

    db.beginTransaction(err => {
        if (err) {
            console.error('Error starting transaction', err);
            return res.status(500).json({ error: 'Error starting transaction' });
        }

        db.query(sqlUpdateItems, [bookingId], (err, result) => {
            if (err) {
                console.error('Error updating item status', err);
                return db.rollback(() => {
                    res.status(500).json({ error: 'Error updating item status' });
                });
            }

            db.query(sqlDeleteItemBooking, [bookingId], (err, result) => {
                if (err) {
                    console.error('Error deleting item booking', err);
                    return db.rollback(() => {
                        res.status(500).json({ error: 'Error deleting item booking' });
                    });
                }

                db.query(sqlDeleteBooking, [bookingId], (err, result) => {
                    if (err) {
                        console.error('Error deleting booking', err);
                        return db.rollback(() => {
                            res.status(500).json({ error: 'Error deleting booking' });
                        });
                    }

                    db.commit(err => {
                        if (err) {
                            console.error('Error committing transaction', err);
                            return db.rollback(() => {
                                res.status(500).json({ error: 'Error committing transaction' });
                            });
                        }
                        res.status(200).json({ message: 'Booking cancelled successfully' });
                    });
                });
            });
        });
    });
});


app.post('/api/book', (req, res) => {
    const { name, arrivalDate, items, children, phone, email, comments, totalPrice, bookingId } = req.body;
    const bookingTimestamp = new Date();

    db.beginTransaction(err => {
        if (err) {
            console.error('Error starting transaction', err);
            return res.status(500).json({ error: 'Error starting transaction' });
        }

        const sqlCheckBooking = "SELECT booking_id FROM bookings WHERE booking_id = ?";
        const sqlInsertBooking = "INSERT INTO bookings (name, arrival_date, children, phone, email, comments, total_price, booking_id, booking_timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
        const sqlUpdateBooking = "UPDATE bookings SET name = ?, arrival_date = ?, children = ?, phone = ?, email = ?, comments = ?, total_price = ?, booking_timestamp = ? WHERE booking_id = ?";

        db.query(sqlCheckBooking, [bookingId], (err, results) => {
            if (err) {
                console.error('Error checking booking existence', err);
                return db.rollback(() => {
                    res.status(500).json({ error: 'Error checking booking existence' });
                });
            }

            const isExistingBooking = results.length > 0;
            const sqlBooking = isExistingBooking ? sqlUpdateBooking : sqlInsertBooking;
            const bookingParams = isExistingBooking
                ? [name, arrivalDate, children, phone, email, comments, totalPrice, bookingTimestamp, bookingId]
                : [name, arrivalDate, children, phone, email, comments, totalPrice, bookingId, bookingTimestamp];

            db.query(sqlBooking, bookingParams, (err, result) => {
                if (err) {
                    console.error(`Error saving booking to database (${isExistingBooking ? 'sqlUpdateBooking' : 'sqlInsertBooking'})`, err);
                    return db.rollback(() => {
                        res.status(500).json({
                            error: `Error saving booking to database (${isExistingBooking ? 'sqlUpdateBooking' : 'sqlInsertBooking'})`,
                            details: err.message
                        });
                    });
                }

                const bookingItems = items.map(itemId => [bookingId, itemId, new Date(arrivalDate).toISOString().slice(0, 19).replace('T', ' ')]);
                const sqlDeleteOldItems = "DELETE FROM item_bookings WHERE booking_id = ?";
                const sqlInsertBookingItems = "INSERT INTO item_bookings (booking_id, item_id, booking_date) VALUES ?";

                db.query(sqlDeleteOldItems, [bookingId], (err) => {
                    if (err) {
                        console.error('Error deleting old booking items', err);
                        return db.rollback(() => {
                            res.status(500).json({
                                error: 'Error deleting old booking items',
                                details: err.message
                            });
                        });
                    }

                    db.query(sqlInsertBookingItems, [bookingItems], (err, result) => {
                        if (err) {
                            console.error('Error saving booking items to database (sqlInsertBookingItems)', err);
                            return db.rollback(() => {
                                res.status(500).json({
                                    error: 'Error saving booking items to database (sqlInsertBookingItems)',
                                    details: err.message
                                });
                            });
                        }

                        const sqlUpdateItems = "UPDATE item_status SET is_booked = TRUE WHERE item_id IN (?)";
                        db.query(sqlUpdateItems, [items], (err, result) => {
                            if (err) {
                                console.error('Error updating item status (sqlUpdateItems)', err);
                                return db.rollback(() => {
                                    res.status(500).json({
                                        error: 'Error updating item status (sqlUpdateItems)',
                                        details: err.message
                                    });
                                });
                            }

                            const getBookingDetails = `
                                SELECT b.booking_id,
                                       b.name,
                                       b.phone,
                                       b.email,
                                       b.comments,
                                       b.arrival_date,
                                       b.total_price,
                                       b.booking_timestamp,
                                       GROUP_CONCAT(CASE WHEN i.item_type = 'bed' THEN bi.item_id END) AS beds,
                                       GROUP_CONCAT(CASE WHEN i.item_type = 'lounger' THEN bi.item_id END) AS loungers
                                FROM bookings b
                                LEFT JOIN item_bookings bi ON b.booking_id = bi.booking_id
                                LEFT JOIN item_status i ON bi.item_id = i.item_id
                                WHERE b.booking_id = ?
                                GROUP BY b.booking_id
                            `;

                            db.query(getBookingDetails, [bookingId], (err, bookingDetails) => {
                                if (err) {
                                    console.error('Error fetching booking details', err);
                                    return res.status(500).json({ error: 'Error fetching booking details' });
                                }

                                db.commit(err => {
                                    if (err) {
                                        console.error('Error committing transaction', err);
                                        return db.rollback(() => {
                                            res.status(500).json({ error: 'Error committing transaction', details: err.message });
                                        });
                                    }

                                    const bookingData = {
                                        booking_id: bookingId,
                                        arrival_date: arrivalDate,
                                        name: name,
                                        phone: phone,
                                        email: email,
                                        comments: comments,
                                        total_price: totalPrice,
                                        booking_timestamp: bookingTimestamp,
                                        beds: bookingDetails[0].beds,
                                        loungers: bookingDetails[0].loungers
                                    };

                                    res.json({
                                        message: 'Booking saved to database',
                                        bookingId,
                                        arrivalDate,
                                        items: {
                                            beds: bookingDetails[0].beds,
                                            loungers: bookingDetails[0].loungers
                                        },
                                        children,
                                        email
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});






app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
