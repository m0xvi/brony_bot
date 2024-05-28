const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

const db = mysql.createConnection({
    host: 'localhost',
    user: 'truykiPosih',
    password: 'DY7nf87f327nh86nt6r6fd&#',
    database: 'booking_db1'
});
db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL');
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
               b.comments,
               b.total_price,
               b.booking_timestamp,
               GROUP_CONCAT(CASE WHEN i.item_type = 'bed' THEN bi.item_id END) AS beds,
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
    const sqlInsertBooking = "INSERT INTO bookings (booking_id, name, arrival_date, children, phone, comments, total_price, booking_timestamp) VALUES (?, 'Администратор', ?, 0, 'N/A', 'Администратор изменил статус', 0, NOW())";
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
                const newBookingId = uuidv4();
                return new Promise((resolve, reject) => {
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

app.post('/api/book', (req, res) => {
    const { name, arrivalDate, items, children, phone, comments, totalPrice } = req.body;
    const bookingId = uuidv4();
    const bookingTimestamp = new Date();

    db.beginTransaction(err => {
        if (err) {
            console.error('Error starting transaction', err);
            return res.status(500).json({ error: 'Error starting transaction' });
        }

        const sqlBooking = "INSERT INTO bookings (name, arrival_date, children, phone, comments, total_price, booking_id, booking_timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        db.query(sqlBooking, [name, arrivalDate, children, phone, comments, totalPrice, bookingId, bookingTimestamp], (err, result) => {
            if (err) {
                console.error('Error saving booking to database (sqlBooking)', err);
                return db.rollback(() => {
                    res.status(500).json({
                        error: 'Error saving booking to database (sqlBooking)',
                        details: err.message
                    });
                });
            }

            console.log(`Booking ID: ${bookingId} inserted into bookings table`);

            const bookingItems = items.map(itemId => [bookingId, itemId, new Date(arrivalDate).toISOString().slice(0, 19).replace('T', ' ')]);

            const sqlBookingItems = "INSERT INTO item_bookings (booking_id, item_id, booking_date) VALUES ?";
            db.query(sqlBookingItems, [bookingItems], (err, result) => {
                if (err) {
                    console.error('Error saving booking items to database (sqlBookingItems)', err);
                    return db.rollback(() => {
                        res.status(500).json({
                            error: 'Error saving booking items to database (sqlBookingItems)',
                            details: err.message
                        });
                    });
                }

                console.log(`Booking items for Booking ID: ${bookingId} inserted into item_bookings table`);

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

                    db.commit(err => {
                        if (err) {
                            console.error('Error committing transaction', err);
                            return db.rollback(() => {
                                res.status(500).json({ error: 'Error committing transaction', details: err.message });
                            });
                        }
                        res.json({ message: 'Booking saved to database', bookingId, name, arrivalDate, items, children });
                    });
                });
            });
        });
    });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
