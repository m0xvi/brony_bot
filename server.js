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
    host: '213.226.126.160',
    user: 'truykiPosih',
    password: 'DY7nf87f327nh86nt6r6fd&#',
    database: 'booking_db'
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
    const clearBookings = "TRUNCATE TABLE bookings";
    const clearBookingItems = "TRUNCATE TABLE booking_items";

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

            db.query(clearBookings, (err, result) => {
                if (err) {
                    console.error('Error clearing bookings', err);
                    return db.rollback(() => {
                        res.status(500).json({ error: 'Error clearing bookings' });
                    });
                }

                db.query(clearBookingItems, (err, result) => {
                    if (err) {
                        console.error('Error clearing booking items', err);
                        return db.rollback(() => {
                            res.status(500).json({ error: 'Error clearing booking items' });
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

app.get('/api/get-items', (req, res) => {
    const type = req.query.type;
    const sql = `
        SELECT item_id, item_type, price, is_booked, 
               CASE 
                   WHEN is_booked = TRUE AND booking_date > NOW() - INTERVAL 1 DAY THEN TRUE
                   ELSE FALSE
               END AS is_booked_today
        FROM item_status 
        WHERE item_type = ? 
    `;
    db.query(sql, [type], (err, result) => {
        if (err) {
            console.error('Error fetching items:', err);
            res.status(500).json({ error: 'Error fetching items from database' });
        } else {
            res.json(result);
        }
    });
});

app.post('/api/admin/update-items', (req, res) => {
    const items = req.body.items;
    const sql = "UPDATE item_status SET is_booked = ? WHERE item_id = ?";

    db.beginTransaction(err => {
        if (err) {
            console.error('Error starting transaction', err);
            return res.status(500).json({ error: 'Error starting transaction' });
        }

        items.forEach(item => {
            db.query(sql, [item.is_booked, item.item_id], (err, result) => {
                if (err) {
                    console.error('Error updating item status', err);
                    return db.rollback(() => {
                        res.status(500).json({ error: 'Error updating item status' });
                    });
                }
            });
        });

        db.commit(err => {
            if (err) {
                console.error('Error committing transaction', err);
                return db.rollback(() => {
                    res.status(500).json({ error: 'Error committing transaction' });
                });
            }
            res.json({ message: 'Items updated successfully' });
        });
    });
});

app.post('/api/book', (req, res) => {
    const { name, arrivalDate, arrivalTime, items, children, phone, comments, totalPrice } = req.body;
    const bookingId = uuidv4();

    db.beginTransaction(err => {
        if (err) {
            console.error('Error starting transaction', err);
            return res.status(500).json({ error: 'Error starting transaction' });
        }

        const sqlBooking = "INSERT INTO bookings (name, arrival_date, arrival_time, children, phone, comments, total_price, booking_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        db.query(sqlBooking, [name, arrivalDate, arrivalTime, children, phone, comments, totalPrice, bookingId], (err, result) => {
            if (err) {
                console.error('Error saving booking to database (sqlBooking)', err); // Enhanced error logging
                return db.rollback(() => {
                    res.status(500).json({ error: 'Error saving booking to database (sqlBooking)', details: err.message });
                });
            }

            console.log(`Booking ID: ${bookingId} inserted into bookings table`); // Logging the inserted booking ID

            const bookingItems = items.map(itemId => [bookingId, itemId]); // Use bookingId instead of bookingRecordId
            const sqlBookingItems = "INSERT INTO booking_items (booking_id, item_id) VALUES ?";

            db.query(sqlBookingItems, [bookingItems], (err, result) => {
                if (err) {
                    console.error('Error saving booking items to database (sqlBookingItems)', err); // Enhanced error logging
                    return db.rollback(() => {
                        res.status(500).json({ error: 'Error saving booking items to database (sqlBookingItems)', details: err.message });
                    });
                }

                console.log(`Booking items for Booking ID: ${bookingId} inserted into booking_items table`); // Logging the booking items insertion

                const sqlUpdateItems = "UPDATE item_status SET is_booked = TRUE, booking_date = NOW() WHERE item_id IN (?)";
                db.query(sqlUpdateItems, [items], (err, result) => {
                    if (err) {
                        console.error('Error updating item status (sqlUpdateItems)', err); // Enhanced error logging
                        return db.rollback(() => {
                            res.status(500).json({ error: 'Error updating item status (sqlUpdateItems)', details: err.message });
                        });
                    }

                    db.commit(err => {
                        if (err) {
                            console.error('Error committing transaction', err); // Enhanced error logging
                            return db.rollback(() => {
                                res.status(500).json({ error: 'Error committing transaction', details: err.message });
                            });
                        }
                        res.json({ message: 'Booking saved to database', bookingId, name, arrivalDate, arrivalTime, items, children });
                    });
                });
            });
        });
    });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
