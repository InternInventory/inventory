const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const randomstring = require('randomstring');
const PDFDocument = require('pdfkit');
const fs = require('fs');       //To read file
const dotenv = require('dotenv');
dotenv.config();
const app = express();

/// hellol

app.use(bodyParser.json());

//MySQL connection configuration
const connection = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
});

// Test
// const connection = mysql.createConnection({
//     host: "localhost",
//     user: "admin_buildINT",
//     password: "buildINT@2023$",
//     database: "inventory",
// });

connection.getConnection((err) => {
    if (err) throw err;
    console.log('Connected to MySQL database');
});

//function to verify token
function verifyToken(req, res, next) {
    // Get token from headers, query parameters, or request body
    const token = req.headers['authorization'];

    if (!token) {
        return res.status(403).json({ error: 'Token is required' });
    }

    jwt.verify(token, "secretkey", (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: 'Failed to authenticate token' });
        }
        req.decoded = decoded;
        next();
    });
}

app.get('/profile', (req, res) => {
    const userId = req.headers['userid'];

    connection.query('SELECT firstName FROM login WHERE userId = ?', [userId], (error, results) => {
        if (error) {
            console.error('Error fetching name from database:', error.stack);
            return res.status(500).json({ error: 'Internal server error' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const firstName = results[0].firstName;
        res.json({ firstName });
        
    });
})





const port = process.env.PORT || 5055;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

