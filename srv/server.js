const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const cors = require('cors');
const {v4: uuidv4} = require('uuid');
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
app.use(bodyParser.urlencoded({extended: true}));
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

// Создание пула соединений
const dbPool = mysql.createPool({
    connectionLimit: 60,
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

dbPool.on('connection', (connection) => {
    console.log('New DB connection established');

    connection.on('error', (err) => {
        console.error('DB Connection Error:', err);
        connection.release();
    });

    connection.on('close', (err) => {
        console.error('DB Connection Closed:', err);
        connection.release();
    });
});

function readHtmlTemplate(filePath, callback) {
    fs.readFile(filePath, 'utf8', callback);
}

function inlineCss(html, css) {
    const styleTag = `<style>${css}</style>`;
    return html.replace('</head>', `${styleTag}</head>`);
}

function populateTemplate(html, data) {
    const imgBeds = data.beds ? 'https://pool.hotelusadba.ru/img/bed.png' : '';
    const imgLoungers = data.loungers ? 'https://pool.hotelusadba.ru/img/lounger.png' : '';

    const imageSrc = data.beds ? imgBeds : (data.loungers ? imgLoungers : '');
    return html
        .replace('{{booking_id}}', data.booking_id)
        .replace('{{arrival_date}}', new Date(data.arrival_date).toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }))
        .replace('{{name}}', data.name || 'Не указано')
        .replace('{{email}}', data.email || 'Не указано')
        .replace('{{phone}}', data.phone || 'Не указано')
        .replace('{{comments}}', data.comments || 'Нет')
        .replace('{{children}}', data.children || '')
        .replace('{{total_price}}', data.total_price || '')
        .replace('{{type_beds}}', data.beds ? data.beds.split(',').map(() => `Кровать`) : '')
        .replace('{{type_loungers}}', data.loungers ? data.loungers.split(',').map(() => `Шезлонг`) : '')
        .replace('{{beds}}', data.beds ? data.beds.split(',').length : '')
        .replace('{{loungers}}', data.loungers ? data.loungers.split(',').length : '')
        .replace('{{item_image}}', imageSrc);
}

function sendConfirmationEmail(email, bookingId, bookingData) {
    readHtmlTemplate('/var/www/html/booking_pool/booking/confirmation.html', (err, html) => {
        if (err) {
            return console.error('Ошибка чтения HTML-шаблона:', err);
        }

        const renderedHtml = populateTemplate(html, bookingData);

        const mailOptions = {
            from: '"Усадьба Бассейн" <pool@hotelusadba.ru>',
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
    console.log('Отправка данных в рецепцию:', bookingData);

    const receptionEmail = 'reception@hotelusadba.ru';
    const subject = `Новое бронирование №${bookingData.booking_id}`;
    const htmlContent = `
        <div class="confirmation-details">
            <h3>Новое бронирование</h3>
            <div class="details">
                <p>Бронирование №: ${bookingData.booking_id}</p>
                <p>Имя: ${bookingData.name}</p>
                <p>Email: ${bookingData.email}</p>
                <p>Телефон: ${bookingData.phone}</p>
                <p>Дата прибытия: ${new Date(bookingData.arrival_date).toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })}</p>
                <p>Время бронирования: ${new Date(bookingData.booking_timestamp).toLocaleString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })}</p>
                <p>Комментарии: ${bookingData.comments}</p>
                <p>Количество детей: ${bookingData.children}</p>
                <p>Общая цена: ${bookingData.total_price} ₽</p>
                <p>Кровати: ${bookingData.beds ? bookingData.beds.split(',').map(id => `Кровать ID: ${id}`).join(', ') : ''}</p>
                <p>Шезлонги: ${bookingData.loungers ? bookingData.loungers.split(',').map(id => `Шезлонг ID: ${id}`).join(', ') : ''}</p>
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

    const {object} = req.body;

    if (object && object.status === 'succeeded') {
        const paymentId = object.id;
        const bookingId = object.description.split('№')[1].trim();
        const email = object.receipt.customer.email;

        console.log(`Оплата успешна для бронирования ID: ${bookingId}`);

        const sql = `
            SELECT b.booking_id,
                   b.name,
                   b.email,
                   b.phone,
                   b.comments,
                   b.arrival_date,
                   b.children,
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

        dbPool.getConnection((err, connection) => {
            if (err) {
                console.error('Error getting DB connection', err);
                return res.status(500).json({error: 'Error getting DB connection'});
            }

            connection.query(sql, [bookingId], (err, result) => {
                connection.release();
                if (err) {
                    console.error('Ошибка получения бронирования:', err);
                    return res.status(500).json({error: 'Ошибка получения бронирования из базы данных'});
                } else if (result.length === 0) {
                    return res.status(404).json({error: 'Бронирование не найдено'});
                } else {
                    const bookingData = result[0];
                    console.log('Данные бронирования:', bookingData);

                    sendConfirmationEmail(email, bookingId, bookingData);
                    sendBookingDetailsToReception(bookingData);
                    res.status(200).send('OK');
                }
            });
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
                       b.name,
                       b.email,
                       b.children,
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

            dbPool.getConnection((err, connection) => {
                if (err) {
                    console.error('Error getting DB connection', err);
                    return;
                }

                connection.query(sql, [bookingId], (err, result) => {
                    connection.release();
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
            });
        } else if (payment.status === 'pending') {
            console.log(`Payment status: still pending for booking ID: ${bookingId}`);
            setTimeout(() => {
                const sqlCheckBooking = `
                    SELECT booking_id
                    FROM bookings
                    WHERE booking_id = ?
                `;
                dbPool.getConnection((err, connection) => {
                    if (err) {
                        console.error('Error getting DB connection', err);
                        return;
                    }
                    connection.query(sqlCheckBooking, [bookingId], (err, results) => {
                        connection.release();
                        if (err) {
                            console.error('Error checking booking existence:', err);
                        } else if (results.length === 0) {
                            console.log(`Booking ID: ${bookingId} no longer exists. Stopping payment status checks.`);
                        } else {
                            checkPaymentStatus(paymentId, bookingId, email);
                        }
                    });
                });
            }, 60000);
        } else {
            console.log(`Payment status: ${payment.status} for booking ID: ${bookingId}`);
        }
    } catch (error) {
        console.error('Error checking payment status:', error);
    }
}

app.post('/api/create-payment', async (req, res) => {
    const {totalPrice, bookingId, email} = req.body;

    console.log('Создание платежа с параметрами:', {totalPrice, bookingId, email});

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
                        description: `Аренда Шезлонга`,
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

        res.json({confirmation_token: payment.confirmation.confirmation_token, bookingId});
    } catch (error) {
        console.error('Error creating payment:', error);
        res.status(500).json({error: error.message});
    }
});

app.get('/api/booking/:paymentId', (req, res) => {
    const paymentId = req.params.paymentId;

    const sql = `
        SELECT b.booking_id,
               b.arrival_date,
               b.name,
               b.email,
               b.phone,
               b.comments,
               b.children,
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

    dbPool.getConnection((err, connection) => {
        if (err) {
            console.error('Error getting DB connection', err);
            return res.status(500).json({error: 'Error getting DB connection'});
        }

        connection.query(sql, [paymentId], (err, result) => {
            connection.release();
            if (err) {
                console.error('Error fetching booking:', err);
                res.status(500).json({error: 'Error fetching booking from database'});
            } else if (result.length === 0) {
                res.status(404).json({error: 'Booking not found'});
            } else {
                res.json(result[0]);
            }
        });
    });
});

app.post('/api/reset-data', (req, res) => {
    const resetItemStatus = "UPDATE item_status SET is_booked = 0, booking_date = NULL";
    const clearBookings = "DELETE FROM bookings";
    const clearBookingItems = "DELETE FROM item_bookings";

    dbPool.getConnection((err, connection) => {
        if (err) {
            console.error('Error getting DB connection', err);
            return res.status(500).json({error: 'Error getting DB connection'});
        }

        connection.beginTransaction(err => {
            if (err) {
                console.error('Error starting transaction', err);
                connection.release();
                return res.status(500).json({error: 'Error starting transaction'});
            }

            connection.query(resetItemStatus, (err) => {
                if (err) {
                    console.error('Error resetting item status', err);
                    return connection.rollback(() => {
                        connection.release();
                        res.status(500).json({error: 'Error resetting item status'});
                    });
                }

                connection.query(clearBookingItems, (err) => {
                    if (err) {
                        console.error('Error clearing booking items', err);
                        return connection.rollback(() => {
                            connection.release();
                            res.status(500).json({error: 'Error clearing booking items'});
                        });
                    }

                    connection.query(clearBookings, (err) => {
                        if (err) {
                            console.error('Error clearing bookings', err);
                            return connection.rollback(() => {
                                connection.release();
                                res.status(500).json({error: 'Error clearing bookings'});
                            });
                        }

                        connection.commit(err => {
                            if (err) {
                                console.error('Error committing transaction', err);
                                return connection.rollback(() => {
                                    connection.release();
                                    res.status(500).json({error: 'Error committing transaction'});
                                });
                            }
                            connection.release();
                            res.json({message: 'Data reset successfully'});
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
        return res.status(400).json({error: 'Invalid date or type'});
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

    dbPool.getConnection((err, connection) => {
        if (err) {
            console.error('Error getting DB connection', err);
            return res.status(500).json({error: 'Error getting DB connection'});
        }

        connection.query(sql, [date, type], (err, result) => {
            connection.release();
            if (err) {
                console.error('Error fetching items:', err);
                res.status(500).json({error: 'Error fetching items from database'});
            } else {
                res.json(result);
            }
        });
    });
});

app.get('/api/admin/get-bookings', (req, res) => {
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
        WHERE b.admin_updated = 0
           OR b.admin_updated IS NULL
        GROUP BY b.booking_id
        ORDER BY b.booking_timestamp DESC
    `;

    dbPool.getConnection((err, connection) => {
        if (err) {
            console.error('Error getting DB connection', err);
            return res.status(500).json({error: 'Error getting DB connection'});
        }

        connection.query(sql, (err, result) => {
            connection.release();
            if (err) {
                console.error('Error fetching bookings:', err);
                res.status(500).json({error: 'Error fetching bookings from database'});
            } else {
                res.json(result);
            }
        });
    });
});

app.post('/api/admin/update-items', (req, res) => {
    const items = req.body.items;
    const sqlUpdateItemStatus = "UPDATE item_status SET is_booked = ?, booking_date = ? WHERE item_id = ?";
    const sqlInsertBooking = "INSERT INTO bookings (booking_id, name, arrival_date, children, phone, email, comments, total_price, booking_timestamp, admin_updated) VALUES (?, 'Администратор', ?, 0, 'N/A', 'N/A', 'Администратор изменил статус', 0, NOW(), 1)";
    const sqlInsertItemBooking = "INSERT INTO item_bookings (item_id, booking_id, booking_date) VALUES (?, ?, ?)";
    const sqlDeleteItemBooking = "DELETE FROM item_bookings WHERE item_id = ? AND booking_date = ?";
    const sqlUpdateBookingAdminFlag = "UPDATE bookings SET admin_updated = 1 WHERE booking_id = ?";

    dbPool.getConnection((err, connection) => {
        if (err) {
            console.error('Error getting DB connection', err);
            return res.status(500).json({error: 'Error getting DB connection'});
        }

        connection.beginTransaction(err => {
            if (err) {
                console.error('Error starting transaction', err);
                connection.release();
                return res.status(500).json({error: 'Error starting transaction'});
            }

            const updatePromises = items.map(item => {
                const bookingDate = item.booking_date ? new Date(item.booking_date).toISOString().slice(0, 19).replace('T', ' ') : null;
                if (item.is_booked === 1) {
                    return new Promise((resolve, reject) => {
                        const newBookingId = uuidv4();
                        connection.query(sqlInsertBooking, [newBookingId, bookingDate], (err) => {
                            if (err) {
                                console.error('Error inserting admin booking', err);
                                return reject(err);
                            }
                            connection.query(sqlInsertItemBooking, [item.item_id, newBookingId, bookingDate], (err) => {
                                if (err) {
                                    console.error('Error inserting item booking', err);
                                    return reject(err);
                                }
                                resolve();
                            });
                        });
                    });
                } else {
                    return new Promise((resolve, reject) => {
                        connection.query(sqlDeleteItemBooking, [item.item_id, bookingDate], (err) => {
                            if (err) {
                                console.error('Error deleting item booking', err);
                                return reject(err);
                            }
                            connection.query(sqlUpdateBookingAdminFlag, [item.booking_id], (err) => {
                                if (err) {
                                    console.error('Error updating booking admin_updated flag', err);
                                    return reject(err);
                                }
                                resolve();
                            });
                        });
                    });
                }
            });

            Promise.all(updatePromises)
                .then(() => {
                    connection.commit(err => {
                        if (err) {
                            console.error('Error committing transaction', err);
                            return connection.rollback(() => {
                                connection.release();
                                res.status(500).json({error: 'Error committing transaction'});
                            });
                        }
                        connection.release();
                        res.json({message: 'Items updated successfully'});
                    });
                })
                .catch(err => {
                    connection.rollback(() => {
                        connection.release();
                        res.status(500).json({error: 'Error updating items'});
                    });
                });
        });
    });
});


app.post('/api/admin/add-items', (req, res) => {
    const {item_type, prices} = req.body;
    if (!item_type || !Array.isArray(prices)) {
        return res.status(400).json({error: 'Invalid input data'});
    }

    let items = prices.map(price => [item_type, price, 0]); // 0 - item is not booked

    const sql = 'INSERT INTO item_status (item_type, price, is_booked) VALUES ?';

    dbPool.getConnection((err, connection) => {
        if (err) {
            console.error('Error getting DB connection', err);
            return res.status(500).json({error: 'Error getting DB connection'});
        }

        connection.query(sql, [items], (err, result) => {
            connection.release();
            if (err) {
                console.error('Ошибка выполнения запроса:', err);
                return res.status(500).json({error: 'Failed to add items', details: err});
            }
            res.json({message: 'Items added successfully', result});
        });
    });
});

app.delete('/api/admin/remove-booking/:bookingId', (req, res) => {
    const bookingId = req.params.bookingId;

    const sqlDeleteBooking = "DELETE FROM bookings WHERE booking_id = ?";
    const sqlDeleteItemBooking = "DELETE FROM item_bookings WHERE booking_id = ?";
    const sqlUpdateItems = "UPDATE item_status SET is_booked = FALSE WHERE item_id IN (SELECT item_id FROM item_bookings WHERE booking_id = ?)";

    dbPool.getConnection((err, connection) => {
        if (err) {
            console.error('Error getting DB connection', err);
            return res.status(500).json({ error: 'Error getting DB connection' });
        }

        connection.beginTransaction(err => {
            if (err) {
                console.error('Error starting transaction', err);
                connection.release();
                return res.status(500).json({ error: 'Error starting transaction' });
            }

            connection.query(sqlDeleteItemBooking, [bookingId], (err) => {
                if (err) {
                    console.error('Error deleting item bookings', err);
                    return connection.rollback(() => {
                        connection.release();
                        res.status(500).json({ error: 'Error deleting item bookings' });
                    });
                }

                connection.query(sqlUpdateItems, [bookingId], (err) => {
                    if (err) {
                        console.error('Error updating item status', err);
                        return connection.rollback(() => {
                            connection.release();
                            res.status(500).json({ error: 'Error updating item status' });
                        });
                    }

                    connection.query(sqlDeleteBooking, [bookingId], (err) => {
                        if (err) {
                            console.error('Error deleting booking', err);
                            return connection.rollback(() => {
                                connection.release();
                                res.status(500).json({ error: 'Error deleting booking' });
                            });
                        }

                        connection.commit(err => {
                            if (err) {
                                console.error('Error committing transaction', err);
                                return connection.rollback(() => {
                                    connection.release();
                                    res.status(500).json({ error: 'Error committing transaction' });
                                });
                            }
                            connection.release();
                            res.json({ message: 'Booking deleted successfully' });
                        });
                    });
                });
            });
        });
    });
});


app.post('/api/admin/remove-items', (req, res) => {
    const {item_ids} = req.body;
    if (!Array.isArray(item_ids) || item_ids.length === 0) {
        return res.status(400).json({error: 'Invalid input data'});
    }

    const deleteBookingsSql = 'DELETE FROM item_bookings WHERE item_id IN (?)';
    const deleteItemsSql = 'DELETE FROM item_status WHERE item_id IN (?)';

    dbPool.getConnection((err, connection) => {
        if (err) {
            console.error('Error getting DB connection', err);
            return res.status(500).json({error: 'Error getting DB connection'});
        }

        connection.query(deleteBookingsSql, [item_ids], (err) => {
            if (err) {
                console.error('Ошибка выполнения запроса на удаление бронирований:', err);
                return connection.rollback(() => {
                    connection.release();
                    res.status(500).json({error: 'Failed to remove item bookings', details: err});
                });
            }

            connection.query(deleteItemsSql, [item_ids], (err, result) => {
                connection.release();
                if (err) {
                    console.error('Ошибка выполнения запроса на удаление предметов:', err);
                    return res.status(500).json({error: 'Failed to remove items', details: err});
                }
                res.json({message: 'Items removed successfully', result});
            });
        });
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

    dbPool.getConnection((err, connection) => {
        if (err) {
            console.error('Error getting DB connection', err);
            return res.status(500).json({error: 'Error getting DB connection'});
        }

        connection.beginTransaction(err => {
            if (err) {
                console.error('Error starting transaction', err);
                connection.release();
                return res.status(500).json({error: 'Error starting transaction'});
            }

            connection.query(sqlUpdateItems, [bookingId], (err) => {
                if (err) {
                    console.error('Error updating item status', err);
                    return connection.rollback(() => {
                        connection.release();
                        res.status(500).json({error: 'Error updating item status'});
                    });
                }

                connection.query(sqlDeleteItemBooking, [bookingId], (err) => {
                    if (err) {
                        console.error('Error deleting item booking', err);
                        return connection.rollback(() => {
                            connection.release();
                            res.status(500).json({error: 'Error deleting item booking'});
                        });
                    }

                    connection.query(sqlDeleteBooking, [bookingId], (err) => {
                        if (err) {
                            console.error('Error deleting booking', err);
                            return connection.rollback(() => {
                                connection.release();
                                res.status(500).json({error: 'Error deleting booking'});
                            });
                        }

                        connection.commit(err => {
                            if (err) {
                                console.error('Error committing transaction', err);
                                return connection.rollback(() => {
                                    connection.release();
                                    res.status(500).json({error: 'Error committing transaction'});
                                });
                            }
                            connection.release();
                            res.status(200).json({message: 'Booking cancelled successfully'});
                        });
                    });
                });
            });
        });
    });
});


app.delete('/api/cancel-payment-book/:bookingId', (req, res) => {
    const bookingId = req.params.bookingId;

    const deleteBookingQuery = `
        DELETE
        FROM bookings
        WHERE booking_id = ?
    `;

    dbPool.getConnection((err, connection) => {
        if (err) {
            console.error('Error getting DB connection', err);
            return res.status(500).json({error: 'Error getting DB connection'});
        }

        connection.query(deleteBookingQuery, [bookingId], (err, results) => {
            connection.release();
            if (err) {
                console.error('Ошибка при удалении временной записи бронирования:', err);
                return res.status(500).json({error: 'Ошибка при удалении временной записи бронирования'});
            }
            res.status(200).json({message: 'Временная запись бронирования удалена'});
        });
    });
});

app.post('/api/book', (req, res) => {
    const {name, arrivalDate, items, children, phone, email, comments, totalPrice, bookingId} = req.body;
    const bookingTimestamp = new Date();

    console.log('Booking request data:', {
        name,
        arrivalDate,
        items,
        children,
        phone,
        email,
        comments,
        totalPrice,
        bookingId
    });

    dbPool.getConnection((err, connection) => {
        if (err) {
            console.error('Error getting DB connection', err);
            return res.status(500).json({error: 'Error getting DB connection'});
        }

        connection.beginTransaction(err => {
            if (err) {
                console.error('Error starting transaction', err);
                connection.release();
                return res.status(500).json({error: 'Error starting transaction'});
            }

            const sqlCheckBooking = "SELECT booking_id FROM bookings WHERE booking_id = ?";
            const sqlInsertBooking = "INSERT INTO bookings (name, arrival_date, children, phone, email, comments, total_price, booking_id, booking_timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
            const sqlUpdateBooking = "UPDATE bookings SET name = ?, arrival_date = ?, children = ?, phone = ?, email = ?, comments = ?, total_price = ?, booking_timestamp = ? WHERE booking_id = ?";

            connection.query(sqlCheckBooking, [bookingId], (err, results) => {
                if (err) {
                    console.error('Error checking booking existence', err);
                    return connection.rollback(() => {
                        connection.release();
                        res.status(500).json({error: 'Error checking booking existence'});
                    });
                }

                const isExistingBooking = results.length > 0;
                const sqlBooking = isExistingBooking ? sqlUpdateBooking : sqlInsertBooking;
                const bookingParams = isExistingBooking
                    ? [name, arrivalDate, children, phone, email, comments, totalPrice, bookingTimestamp, bookingId]
                    : [name, arrivalDate, children, phone, email, comments, totalPrice, bookingId, bookingTimestamp];

                connection.query(sqlBooking, bookingParams, (err, result) => {
                    if (err) {
                        console.error(`Error saving booking to database (${isExistingBooking ? 'sqlUpdateBooking' : 'sqlInsertBooking'})`, err);
                        return connection.rollback(() => {
                            connection.release();
                            res.status(500).json({
                                error: `Error saving booking to database (${isExistingBooking ? 'sqlUpdateBooking' : 'sqlInsertBooking'})`,
                                details: err.message
                            });
                        });
                    }

                    const bookingItems = items.map(itemId => [bookingId, itemId, new Date(arrivalDate).toISOString().slice(0, 19).replace('T', ' ')]);
                    const sqlDeleteOldItems = "DELETE FROM item_bookings WHERE booking_id = ?";
                    const sqlInsertBookingItems = "INSERT INTO item_bookings (booking_id, item_id, booking_date) VALUES ?";

                    connection.query(sqlDeleteOldItems, [bookingId], (err) => {
                        if (err) {
                            console.error('Error deleting old booking items', err);
                            return connection.rollback(() => {
                                connection.release();
                                res.status(500).json({
                                    error: 'Error deleting old booking items',
                                    details: err.message
                                });
                            });
                        }

                        connection.query(sqlInsertBookingItems, [bookingItems], (err, result) => {
                            if (err) {
                                console.error('Error saving booking items to database (sqlInsertBookingItems)', err);
                                return connection.rollback(() => {
                                    connection.release();
                                    res.status(500).json({
                                        error: 'Error saving booking items to database (sqlInsertBookingItems)',
                                        details: err.message
                                    });
                                });
                            }

                            const sqlUpdateItems = "UPDATE item_status SET is_booked = TRUE WHERE item_id IN (?)";
                            connection.query(sqlUpdateItems, [items], (err, result) => {
                                if (err) {
                                    console.error('Error updating item status (sqlUpdateItems)', err);
                                    return connection.rollback(() => {
                                        connection.release();
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
                                           b.children,
                                           b.arrival_date,
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

                                connection.query(getBookingDetails, [bookingId], (err, bookingDetails) => {
                                    if (err) {
                                        console.error('Error fetching booking details', err);
                                        return connection.rollback(() => {
                                            connection.release();
                                            res.status(500).json({error: 'Error fetching booking details'});
                                        });
                                    }

                                    connection.commit(err => {
                                        if (err) {
                                            console.error('Error committing transaction', err);
                                            return connection.rollback(() => {
                                                connection.release();
                                                res.status(500).json({
                                                    error: 'Error committing transaction',
                                                    details: err.message
                                                });
                                            });
                                        }
                                        connection.release();
                                        res.json({bookingId, ...bookingDetails[0]});
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
    console.log(`Server is running on port ${port}`);
});


