const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');

const app = express();

app.use(bodyParser.json());

// MySQL connection configuration
const connection = mysql.createPool({
    host: "3.7.158.221",
    user: "admin_buildINT",
    password: "buildINT@2023$",
    database: "checklist_uat",
});

connection.getConnection((err) => {
    if (err) throw err;
    console.log('Connected to MySQL database');
});

// Routes
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Check if the user exists
    connection.query('SELECT * FROM highft_login WHERE username = ? AND password = ?', [username, password], (err, results) => {
        if (err) {
            console.log(err);
            res.status(500).json({ error: 'Internal server error' });
            return;
        }

        if (results.length === 0) {
            res.status(401).json({ error: 'Invalid username or password' });
            return;
        }

        const user = results[0];

        // User is authenticated; generate a JWT token
        const token = jwt.sign({ id: user.id, username: user.username }, 'secretkey', {
            expiresIn: '12h', // Token expires in 12 hours
        });

        // Calculate the expiration time (current time + 12 hours)
        const expirationTime = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

        // Update the database with the JWT token and expiration time
        connection.query('UPDATE highft_login SET jwt_token = ?, expiration_time = ? WHERE username = ?', [token, expirationTime, user.username], (updateErr) => {
            if (updateErr) {
                console.log(updateErr);
                res.status(500).json({ error: 'Failed to update JWT token and expiration time in the database' });
                return;
            }
            
            res.status(200).json({ token, expirationTime });
        });
    });
});
app.post('/day', (req, res) => {
    const { username, day, comment, date } = req.body;

    // Validate input
    if (!username || !day || !comment || !date) {
        return res.status(400).json({ message: 'Username, day, date, and comment are required' });
    }

    

    // Update the record in the MySQL database
    const sql = `UPDATE highft_login SET day = ?, comment = ?, date = ? WHERE username = ?`;

    const values = [day, comment, date, username];

    connection.query(sql, values, (err, results) => {
        if (err) {
            console.error('Error updating data in MySQL:', err);
            return res.status(500).json({ message: 'Error updating data in the database.' });
        }


        if (results.affectedRows === 0) {
            return res.status(404).json({ message: 'Record not found' });
        }

        return res.json({ message: 'Item updated successfully' });
    });
});



const port = process.env.PORT || 5001;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
