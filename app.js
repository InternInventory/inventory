const app = require('express')();
const mysql = require('mysql2');


const PORT = 8080;

// d

app.get('/fruits', (req, res) => {
    res.send("Mango and Apple, grapes")
});

app.listen(
    PORT,
    () => console.log(`Server running on ${PORT}`)
);