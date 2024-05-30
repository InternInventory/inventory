const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql2");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const randomstring = require("randomstring");
const PDFDocument = require("pdfkit");
const fs = require("fs"); //To read file
const multer = require('multer');
const xlsx = require('xlsx');
const dotenv = require("dotenv");
dotenv.config();
const app = express();

/// hellol

app.use(bodyParser.json());

//MySQL connection configuration
// const connection = mysql.createPool({
//     host: process.env.DB_HOST,
//     user: process.env.DB_USER,
//     password: process.env.DB_PASSWORD,
//     database: process.env.DB_DATABASE,
// });

// Test
const connection = mysql.createPool({
    host: "3.7.158.221",
    user: "admin_buildINT",
    password: "buildINT@2023$",
    database: "inventory",
});

connection.getConnection((err) => {
    if (err) throw err;
    console.log("Connected to MySQL database");
});

//function to verify token
function verifyToken(req, res, next) {
    // Get token from headers, query parameters, or request body
    const token = req.headers["authorization"];

    if (!token) {
        return res.status(403).json({ error: "Token is required" });
    }

    jwt.verify(token, "secretkey", (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: "Failed to authenticate token" });
        }
        req.decoded = decoded;
        next();
    });
}

// Routes
app.post("/login", async (req, res) => {
    const { username, password } = req.body;

    // Check if the user exists
    connection.query(
        "SELECT * FROM login WHERE username = ?",
        [username],
        async (err, results) => {
            if (err) {
                console.log(err);
                res.status(500).json({ error: "Internal server error" });
                return;
            }

            if (results.length === 0) {
                res.status(401).json({ error: "Invalid username or password" });
                return;
            }

            const user = results[0];

            // Compare entered password with password in database
            const compare = await bcrypt.compare(password, user.password);
            if (!compare) {
                console.log("Unauthorized");
                res.status(401).json({ error: "Invalid Password" });
                return;
            }

            // User is authenticated; generate a JWT token
            const token = jwt.sign(
                { id: user.id, username: user.username, role: user.role },
                "secretkey",
                {
                    // Token expires in 1 hour
                }
            );
            // Update the database with the JWT token
            connection.query(
                "UPDATE login SET token = ? WHERE username = ?",
                [token, user.username],
                (updateErr, updateResults) => {
                    if (updateErr) {
                        console.log(updateErr);
                        res
                            .status(500)
                            .json({ error: "Failed to update JWT token in the database" });
                        return;
                    }

                    res.status(200).json({ token: token, role: user.role });
                }
            );
        }
    );
});

/*app.post('/hash_password', async (req, res) => {
    try {
        // Get the password from the request body
        const { username, password } = req.body;

        // Check if password is provided
        if (!password) {
            return res.status(400).json({ error: 'Password not provided' });
        }

        // Hash the password using bcrypt
        const hashedPassword = await bcrypt.hash(password, 10);

        // Log the hashed password to verify
        console.log('Hashed password:', hashedPassword);
        //const user = results[0];

        // Update the database with the hashed password
        connection.query('UPDATE login SET password = ? WHERE username = ?', [hashedPassword, username], (updateErr, updateResults) => {
            if (updateErr) {
                console.log(updateErr);
                return res.status(500).json({ error: 'Failed to update hashed password in the database' });
            }

            // Log the update results to verify
            console.log('Update results:', updateResults);

            res.status(200).json({ success: true });
        });

    } catch (error) {
        console.error('Error hashing password:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
*/

// app.post("/add-items", (req, res) => {
//   const { item_name, supplier_name } = req.body;

//   if (!item_name || !supplier_name) {
//     return res
//       .status(400)
//       .json({ error: "Missing required fields (name, quantity)" });
//   }

//   const newItem = {
//     item_name,
//     supplier_name,
//   };

//   connection.query("INSERT INTO additem SET ?", newItem, (error, results) => {
//     if (error) {
//       console.error("Error inserting item into database: " + error.stack);
//       return res.status(500).json({ error: "Internal server error" });
//     }
//     console.log("Item added to database with ID: " + results.insertId);
//     res.status(201).json({ message: "Item added successfully", item: newItem });
//   });
// });

app.post("/additem", (req, res) => {
    const { item_id, item_name, quantity, supplier_name } = req.body;

    // Ensure quantity is treated as an integer
    const parsedQuantity = parseInt(quantity);

    // Check if item exists
    connection.query(
        "SELECT * FROM additem WHERE item_name = ?",
        [item_name],
        (error, results) => {
            if (error) throw error;

            if (results.length) {
                // Update query to add quantity to existing quantity
                const existingQuantity = results[0].quantity;
                const updatedQuantity = existingQuantity + parsedQuantity;
                connection.query(
                    "UPDATE additem SET quantity = ?, date = CURRENT_TIMESTAMP(), supplier_name = ? WHERE item_name = ?",
                    [updatedQuantity, supplier_name, item_name],
                    (err, result) => {
                        if (err) throw err;
                        res.send("Quantity updated successfully");
                    }
                );
            } else {
                // Insert query
                connection.query(
                    "INSERT INTO additem (item_name, quantity, date, supplier_name) VALUES (?, ?, CURRENT_TIMESTAMP(), ?)",
                    [item_name, parsedQuantity, supplier_name],
                    (err, result) => {
                        if (err) throw err;
                        res.send("Item added successfully");
                    }
                );
            }
        }
    );
});

// app.post('/additem', (req, res) => {
//     const { item_id, item_name, quantity, supplier_name } = req.body;

//     // Ensure quantity is treated as an integer
//     const parsedQuantity = parseInt(quantity);

//     // Check if item exists
//     connection.query('SELECT * FROM additem WHERE item_name = ?', [item_name], (error, results) => {
//         if (error) throw error;

//         if (sendmaterial.quantity < additem.quantity) {
//             // Update query to add quantity to existing quantity
//             const existingQuantity = results[0].quantity;
//             const updatedQuantity = existingQuantity + parsedQuantity;
//             connection.query('UPDATE additem SET quantity = ?, date = CURRENT_TIMESTAMP(), supplier_name = ? WHERE item_name = ?', [updatedQuantity, supplier_name, item_name], (err, result) => {
//                 if (err) throw err;
//                 res.send('Quantity updated successfully');
//             });
//         } else {
//             // Insert query
//             connection.query('INSERT INTO additem (item_name, quantity, date, supplier_name) VALUES (?, ?, CURRENT_TIMESTAMP(), ?)', [item_name, parsedQuantity, supplier_name], (err, result) => {
//                 if (err) throw err;
//                 res.send('Item added successfully');
//             });
//         }
//     });
// });

// app.get("/added-item-list", (req, res) => {
//   const { item_name } = req.body;

//   connection.query("SELECT * FROM additem", (error, results) => {
//     if (error) {
//       console.error("Error fetching items from database:", error.stack);
//       return res.status(500).json({ error: "Internal server error" });
//     }
//     res.json({ items: results });
//   });
// });

app.post("/send-material1", (req, res) => {
    const {
        project_name,
        site_id,
        quantity,
        receiver_name,
        location,
        date,
        mode_of_dispatch,
        item_id,
    } = req.body;
    console.log(req.body);

    if (
        !project_name ||
        !site_id ||
        !quantity ||
        !receiver_name ||
        !location ||
        !date ||
        !mode_of_dispatch ||
        !item_id
    ) {
        return res
            .status(400)
            .json({ error: "Missing required fields (name, quantity)" });
    }

    // Check if site_id exists in additem table
    connection.query(
        "SELECT * FROM additem WHERE item_id = ?",
        [item_id],
        (error, results) => {
            if (error) {
                console.error("Error querying database: " + error.stack);
                return res.status(500).json({ error: "Internal server error" });
            }
            if (results.length === 0) {
                return res
                    .status(404)
                    .json({ error: "Site ID not found in additem table" });
            }

            const item = results[0]; // Assuming there's only one match
            if (item.quantity < quantity) {
                return res
                    .status(400)
                    .json({ error: "Insufficient quantity in additem table" });
            }

            // Subtract quantity from additem table
            const remainingQuantity = item.quantity - quantity;
            connection.query(
                "UPDATE additem SET quantity = ? WHERE item_id = ?",
                [remainingQuantity, item_id],
                (updateError, updateResults) => {
                    if (updateError) {
                        console.error(
                            "Error updating quantity in additem table: " + updateError.stack
                        );
                        return res.status(500).json({ error: "Internal server error" });
                    }

                    const sendMaterial = {
                        project_name,
                        site_id,
                        quantity,
                        receiver_name,
                        location,
                        date,
                        mode_of_dispatch,
                        item_id,
                    };

                    // Insert sendMaterial into sendmaterial table
                    connection.query(
                        "INSERT INTO sendmaterial SET ?",
                        sendMaterial,
                        (insertError, insertResults) => {
                            if (insertError) {
                                console.error(
                                    "Error inserting item into sendmaterial table: " +
                                    insertError.stack
                                );
                                return res.status(500).json({ error: "Internal server error" });
                            }

                            console.log(
                                "Item added to database with ID: " + insertResults.insertId
                            );
                            res.status(201).json({
                                message: "Material sent successfully",
                                item: sendMaterial,
                            });
                        }
                    );
                }
            );
        }
    );
});

// app.post('/send-material', (req, res) => {
//     const { project_name, site_id, quantity, receiver_name, location, date, mode_of_dispatch } = req.body;

//     if (!project_name || !site_id || !quantity || !receiver_name || !location || !date || !mode_of_dispatch) {
//         return res.status(400).json({ error: 'Missing required fields (name, quantity)' });
//     }

//     const sendMaterial = {
//         project_name,
//         site_id,
//         quantity,
//         receiver_name,
//         location,
//         date,
//         mode_of_dispatch
//     };

//     connection.query('INSERT INTO sendmaterial SET ?', sendMaterial, (error, results) => {
//         if (error) {
//             console.error('Error inserting item into database: ' + error.stack);
//             return res.status(500).json({ error: 'Internal server error' });
//         }
//         console.log('Item added to database with ID: ' + results.insertId);
//         res.status(201).json({ message: 'Material send successfully', item: sendMaterial });
//     });
// })

// app.post('/send-material', (req, res) => {
//     const { project_name, site_id, material, quantity, approved_by, challan_id, mode_of_dispatch } = req.body;

//     const sql = `INSERT INTO sendmaterial (project_name, siteid, material, quantity, approved_by, challan_id, mode_of_dispatch) VALUES (?, ?, ?, ?, ?, ?, ?)`;
//     const values = [project_name, site_id, material, quantity, approved_by, challan_id, mode_of_dispatch];

//     connection.query(sql, values, (err, result) => {
//         if (err) {
//             console.error('Error inserting data into send_material table: ' + err.stack);
//             res.status(500).send('Error inserting data into send_material table');
//             return;
//         }
//         console.log('Data inserted into send_material table');
//         // Update quantity in add_item table
//         updateQuantityInAddItem(material, quantity);
//         res.status(200).send('Data inserted into send_material table');
//     });
// });

// // Function to update quantity in add_item table
// function updateQuantityInAddItem(material, quantity) {
//     const sql = `UPDATE additem SET quantity = quantity - ? WHERE material = ?`;
//     const values = [quantity, material];

//     connection.query(sql, values, (err, result) => {
//         if (err) {
//             console.error('Error updating quantity in add_item table: ' + err.stack);
//             return;
//         }
//         console.log('Quantity updated in add_item table');
//     });
// }

app.post("/recieved-material", (req, res) => {
    const {
        project_name,
        site_id,
        material,
        quantity,
        approved_by,
        challan_id,
        mode_of_dispatch,
    } = req.body;

    const sql = `INSERT INTO sendmaterial (project_name, siteid, material, quantity, approved_by, challan_id, mode_of_dispatch) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const values = [
        project_name,
        site_id,
        material,
        quantity,
        approved_by,
        challan_id,
        mode_of_dispatch,
    ];

    connection.query(sql, values, (err, result) => {
        if (err) {
            console.error(
                "Error inserting data into send_material table: " + err.stack
            );
            res.status(500).send("Error inserting data into send_material table");
            return;
        }
        console.log("Data inserted into send_material table");
        // Update quantity in add_item table
        updateQuantityInAddItem(material, quantity);
        res.status(200).send("Data inserted into send_material table");
    });
});

// Function to update quantity in add_item table
function updateQuantityInAddItem(material, quantity) {
    const sql = `UPDATE additem SET quantity = quantity - ? WHERE material = ?`;
    const values = [quantity, material];

    connection.query(sql, values, (err, result) => {
        if (err) {
            console.error("Error updating quantity in add_item table: " + err.stack);
            return;
        }
        console.log("Quantity updated in add_item table");
    });
}

app.post("/create-user", (req, res) => { });

app.get("/stocks", (req, res) => {
    connection.query("SELECT * FROM additem", (error, results) => {
        if (error) {
            console.error("Error fetching items from database:", error.stack);
            return res.status(500).json({ error: "Internal server error" });
        }
        res.json({ items: results });
    });
});

app.get("/history", (req, res) => {
    connection.query("SELECT * FROM history", (error, results) => {
        if (error) {
            console.error("Error fetching items from database:", error.stack);
            return res.status(500).json({ error: "Internal server error" });
        }
        res.json({ items: results });
    });
});
app.get("/profile", verifyToken, (req, res) => {
    const userId = req.decoded.userId;

    connection.query(
        "SELECT firstName FROM login WHERE userId = ?",
        [userId],
        (error, results) => {
            if (error) {
                console.error("Error fetching name from database:", error.stack);
                return res.status(500).json({ error: "Internal server error" });
            }
            if (results.length === 0) {
                return res.status(404).json({ error: "User not found" });
            }

            const firstName = results[0].firstName;
            res.json({ firstName });
        }
    );
});

app.post("/change-password", (req, res) => {
    const { username, currentPassword, newPassword } = req.body;

    // Check if all required fields are provided
    if (!username || !currentPassword || !newPassword) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    // Fetch user from the database based on username
    connection.query(
        "SELECT * FROM login WHERE username = ?",
        username,
        (error, results, fields) => {
            if (error) {
                console.error("Error fetching user from database:", error.stack);
                return res.status(500).json({ error: "Internal server error" });
            }
            if (results.length === 0) {
                return res.status(404).json({ error: "User not found" });
            }

            const user = results[0];

            // Decrypt the stored password
            bcrypt.compare(currentPassword, user.password, (err, passwordMatch) => {
                if (err) {
                    console.error("Error comparing passwords:", err);
                    return res.status(500).json({ error: "Internal server error" });
                }

                if (!passwordMatch) {
                    return res
                        .status(401)
                        .json({ error: "Current password is incorrect" });
                }

                // Hash the new password
                bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
                    if (err) {
                        console.error("Error hashing new password:", err);
                        return res.status(500).json({ error: "Internal server error" });
                    }

                    // Update user's password in the database
                    connection.query(
                        "UPDATE login SET password = ? WHERE username = ?",
                        [hashedPassword, username],
                        (error, results, fields) => {
                            if (error) {
                                console.error(
                                    "Error updating password in database:",
                                    error.stack
                                );
                                return res.status(500).json({ error: "Internal server error" });
                            }
                            res.json({ message: "Password changed successfully" });
                        }
                    );
                });
            });
        }
    );
});

// app.post('/request-material', (req, res) => {
//     const { name, site_name, material, date_of_request, quantity } = req.body;

//     if (!name || !site_name || !material || !date_of_request || !quantity) {
//         return res.status(400).json({ error: 'Missing required fields (name, quantity)' });
//     }

//     const requestMaterial = {
//         name,
//         site_name,
//         material,
//         date_of_request,
//         quantity

//     };

//     connection.query('INSERT INTO requestmaterial SET ?', requestMaterial, (error, results) => {
//         if (error) {
//             console.error('Error inserting item into database: ' + error.stack);
//             return res.status(500).json({ error: 'Internal server error' });
//         }
//         console.log('Item added to database with ID: ' + results.insertId);
//         res.status(201).json({ message: 'Material requested successfully', item: requestMaterial });
//     });
// })

const transporter = nodemailer.createTransport({
    host: "smtp.rediffmailpro.com",
    port: 465,
    secure: true,
    auth: {
        user: "Interns@buildint.co",
        pass: "Interns@2024",
    },
});
app.post("/request-material", (req, res) => {
    const { name, site_name, material, quantity, userId } = req.body;

    if (!name || !site_name || !material || !quantity || !userId) {
        return res.status(400).json({
            error:
                "Missing required fields (name, site_name, material, date_of_request, quantity, user_id)",
        });
    }

    // Fetch user's email from login table
    connection.query(
        "SELECT email FROM login WHERE userId = ?",
        userId,
        (error, results) => {
            if (error) {
                console.error("Error fetching user email: " + error.stack);
                return res.status(500).json({ error: "Internal server error" });
            }

            if (results.length === 0) {
                return res.status(404).json({ error: "User not found" });
            }

            const userEmail = results[0].email;

            const uniqueId = generateUniqueId();

            const requestMaterial = {
                ids: uniqueId,
                name,
                site_name,
                material,
                quantity,
            };

            connection.query(
                "INSERT INTO requestmaterial SET ?",
                requestMaterial,
                (error, insertResult) => {
                    if (error) {
                        console.error("Error inserting item into database: " + error.stack);
                        return res.status(500).json({ error: "Internal server error" });
                    }

                    console.log(
                        "Item added to database with ID: " + insertResult.insertId
                    );

                    // Send email to user
                    sendEmail(userEmail, requestMaterial);

                    res.status(201).json({
                        message: "Material requested successfully",
                        item: requestMaterial,
                    });
                }
            );
        }
    );
});

function generateUniqueId() {
    const randomNumber = Math.floor(Math.random() * 90000) + 10000; // Generate a random number between 10000 and 99999
    return randomNumber.toString(); // Convert the number to a string and return
}

function sendEmail(email, requestMaterial) {
    const mailOptions = {
        from: "Interns@buildint.co",
        to: email,
        subject: "Material Request Confirmation",
        text: `Dear User,\n\nYour request for material ${requestMaterial.material} has been successfully submitted.\n\nRequest ID: ${requestMaterial.ids}\n\nThank you.`,
    };

    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.error("Error sending email: " + error);
        } else {
            console.log("Email sent: " + info.response);
        }
    });
}

app.get("/raised-request", (req, res) => {
    connection.query("SELECT * FROM requestmaterial", (error, results) => {
        if (error) {
            console.error("Error fetching items from database", error.stack);
            return res.status(500).json({ error: "Internal server error" });
        }
        res.json({ items: results });
    });
});

app.get("/approved-history", (req, res) => {
    const { name } = req.body;
    connection.query("SELECT * FROM approvedhistory", (error, results) => {
        if (error) {
            console.error("Error fetching itemrs from database ,error.stack");
            return res.status(500).json({ error: "Internal server error" });
        }
        res.json({ items: results });
    });
});

app.post("/edit-profile", verifyToken, (req, res) => {
    const { username, firstName, lastName, email } = req.body;

    if (!username || !firstName || !lastName || !email) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    connection.query(
        "UPDATE login SET firstName = ?, lastName = ?, email = ? WHERE username = ?",
        [firstName, lastName, email, username],
        (error, results) => {
            if (error) {
                console.error("Error inserting item into database: " + error.stack);
                return res.status(500).json({ error: "Internal server error" });
            }
            console.log("Item added to database with ID: " + results.insertId);
            res.status(201).json({ message: "Profile edited successfully" });
        }
    );
});

app.post("/forgot-password", (req, res) => {
    const { email } = req.body;

    // Generate a random OTP
    const otp = randomstring.generate({
        length: 6,
        charset: "numeric",
    });
    const expirationTime = new Date(Date.now() + 600000); //OTP expires in 10 min

    // Create a nodemailer transporter
    const transporter = nodemailer.createTransport({
        host: "smtp.rediffmailpro.com",
        port: 465,
        secure: true,
        auth: {
            user: "trainee.software@buildint.co",
            pass: "BuildINT@123",
        },
    });

    // Email message
    const mailOptions = {
        from: "trainee.software@buildint.co",
        to: email,
        subject: "Your OTP for verification",
        text: `Your OTP is: ${otp}`,
    };

    // Send email with OTP
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error("Error sending email:", error);
            return res.status(500).json({ error: "Failed to send OTP via email" });
        }
        console.log("Email sent:", info.response);

        //UPDATE the database
        connection.query(
            "UPDATE login SET otp = ?, expirationTime = ? WHERE email = ?",
            [otp, expirationTime, email],
            (error, results) => {
                if (error) {
                    console.error("Error storing OTP in database:", error);
                    return res
                        .status(500)
                        .json({ error: "Failed to store OTP in database" });
                }
                console.log("OTP stored in database");
                res.status(200).json({ message: "OTP generated and sent via email" });
            }
        );
    });
});

app.post("/add-po", (req, res) => {
    const { poCode, supplier, items, unit, quantity, datecreated, status } =
        req.body;

    if (
        !poCode ||
        !supplier ||
        !items ||
        !unit ||
        !quantity ||
        !datecreated ||
        !status
    ) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    const polist = {
        poCode,
        supplier,
        items,
        unit,
        quantity,
        datecreated,
        status,
    };

    connection.query("INSERT INTO polist SET ?", polist, (error, results) => {
        if (error) {
            console.error("Error inserting item into database: " + error.stack);
            return res.status(500).json({ error: "Internal server error" });
        }
        console.log("Item added to database with ID: " + results.insertId);
        res.status(201).json({ message: "P.O. added successfully", item: polist });
    });
});

app.get("/purchase-order", (req, res) => {
    connection.query("SELECT * FROM polist", (error, results) => {
        if (error) {
            console.error("Error fetching itemrs from database ,error.stack");
            return res.status(500).json({ error: "Internal server error" });
        }
        res.json({ items: results });
    });
});

app.post("/add-supplier", (req, res) => {
    const {
        name,
        contact_person,
        contact_number,
        address,
        status,
        created_date,
        created_by,
    } = req.body;

    // Check if all required fields are present
    if (
        !name ||
        !contact_person ||
        !contact_number ||
        !address ||
        !status ||
        !created_date ||
        !created_by
    ) {
        res.status(400).json({ error: "Missing required fields" });
        return;
    }

    // Sanitize inputs (optional, depending on your application's requirements)

    // Create a SQL query to insert data into the database
    const query = `INSERT INTO suppliers (name, contact_person, contact_number, address, status, created_date, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)`;

    // Execute the query
    connection.query(
        query,
        [
            name,
            contact_person,
            contact_number,
            address,
            status,
            created_date,
            created_by,
        ],
        (error, results) => {
            if (error) {
                console.error("Error executing query:", error);
                res.status(500).json({ error: "Internal server error" });
                return;
            }

            // Data inserted successfully
            res.status(201).json({ message: "Data inserted successfully" });
        }
    );
});

//For PO
app.post("/api/add-record", (req, res) => {
    const {
        po_code,
        supplier_id,
        item_id,
        quantity,
        status,
        created_by,
        created_at,
        updated_at,
    } = req.body;

    // Check if all required fields are present
    if (
        !po_code ||
        !supplier_id ||
        !item_id ||
        !quantity ||
        !status ||
        !created_by ||
        !created_at ||
        !updated_at
    ) {
        res.status(400).json({ error: "Missing required fields" });
        return;
    }

    // Create a SQL query to insert data into the database
    const query = `INSERT INTO po_list (po_code, supplier_id, item_id, quantity, status, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

    // Execute the query
    connection.query(
        query,
        [
            po_code,
            supplier_id,
            item_id,
            quantity,
            status,
            created_by,
            created_at,
            updated_at,
        ],
        (error, results) => {
            if (error) {
                console.error("Error executing query:", error);
                res.status(500).json({ error: "Internal server error" });
                return;
            }

            // Data inserted successfully
            res.status(201).json({ message: "Data inserted successfully" });
        }
    );
});

// For adding items into stocks table (add-item)
app.post("/api/add-item", (req, res) => {
    const { item_id, item_name, added_date, supplier_id, make, mac_id, stock_holder_name, stock_holder_contact, stock_status, working_status, rack, slot } = req.body;

    // Check if all required fields are present
    if (!item_id || !item_name || !added_date || !supplier_id || !make || !mac_id || !stock_holder_name || !stock_holder_contact || !stock_status || !working_status || !rack || !slot) {
        res.status(400).json({ error: "Missing required fields" });
        return;
    }

    // Create a SQL query to insert data into the database
    const query = `INSERT INTO stocks (item_id, item_name, added_date, supplier_id, make, mac_id, stock_holder_name, stock_holder_contact, stock_status, working_status, rack, slot ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    // Execute the query
    connection.query(
        query,
        [item_id, item_name, added_date, supplier_id, make, mac_id, stock_holder_name, stock_holder_contact, stock_status, working_status, rack, slot],
        (error, results) => {
            if (error) {
                console.error("Error executing query:", error);
                res.status(500).json({ error: "Internal server error" });
                return;
            }

            // Data inserted successfully
            res.status(201).json({ message: "Item inserted successfully" });
        }
    );
});

//add project
app.post("/api/add-project", (req, res) => {
    const { name, created_by, updated_by } = req.body;

    // Check if all required fields are present
    if (!name || !created_by) {
        res.status(400).json({ error: "Missing required fields" });
        return;
    }

    const query = `INSERT INTO projects (name, created_by) VALUES (?, ?)`;

    // Execute the query
    connection.query(query, [name, created_by], (error, results) => {
        if (error) {
            console.error("Error executing query:", error);
            res.status(500).json({ error: "Internal server error" });
            return;
        }

        // Data inserted successfully
        res.status(201).json({ message: "Record inserted successfully" });
    });
});

//to see projects for drop down on send material
app.get("/projects", (req, res) => {
    connection.query("SELECT id,name FROM projects", (error, results) => {
        if (error) {
            console.error("Error fetching itemrs from database ,error.stack");
            return res.status(500).json({ error: "Internal server error" });
        }
        res.json({ items: results });
    });
});

//send items
// app.put('/api/update-record/:id', (req, res) => {
//     const { project_name, cost, receiver_name, receiver_contact, location, updated_date, chalan_id, description } = req.body;
//     const id = req.params.id;
//     const item_id = 1

//     // Create a SQL query to update data in the database
//     const query = `UPDATE stocks SET item_status = ?,project_name=?, cost=?, receiver_name=?, receiver_contact=?, location=?, updated_date=?, chalan_id=?, description=? WHERE id=?`;

//     // Execute the query
//     connection.query(query, [item_id, project_name, cost, receiver_name, receiver_contact, location, updated_date, chalan_id, description, id], (error, results) => {
//       if (error) {
//         console.error('Error executing query:', error);
//         res.status(500).json({ error: 'Internal server error' });
//         return;
//       }

//       if (results.affectedRows === 0) {
//         res.status(404).json({ error: 'Record not found' });
//         return;
//       }

//       // Data updated successfully
//       res.status(200).json({ message: 'Record updated successfully' });
//     });
//   });

// To get item list for send material page
app.get("/item-list", (req, res) => {
    let query = `SELECT * FROM inventory.stocks;`;

    connection.query(query, (error, results) => {
        if (error) {
            console.error("Error fetching itemrs from database ,error.stack");
            return res.status(500).json({ error: "Internal server error" });
        }
        res.json({ items: results });
    });
});

// To update database for sent materials
app.post("/update-record/:id", (req, res) => {
    const {
        project_name,
        cost,
        receiver_name,
        receiver_contact,
        location,
        updated_date,
        chalan_id,
        description,
        mod,
    } = req.body;

    const id = req.params.id;

    const item_status = 1;
    let values = [
        item_status,
        project_name,
        cost,
        receiver_name,
        receiver_contact,
        location,
        updated_date,
        chalan_id,
        description,
        mod,
        id,
    ];

    const query = `UPDATE stocks SET item_status = ?, project_name=?, cost=?, reciever_name=?, reciever_contact=?, Location=?, updated_date=?, chalan_id=?, description=?, \`mod\`=? WHERE id=?`;

    connection.query(query, values, (error, results) => {
        if (error) {
            console.error("Error executing query:", error);
            res.status(500).json({ error: "Internal server error" });
            return;
        }

        if (results.affectedRows === 0) {
            res.status(404).json({ error: "Record not found" });
            return;
        }

        // Data updated successfully
        res.status(200).json({ message: "Record updated successfully" });
    });
});

app.get("/supplier-list", (req, res) => {
    connection.query("SELECT * FROM supplierlist", (error, results) => {
        if (error) {
            console.error("Error fetching itemrs from database ,error.stack");
            return res.status(500).json({ error: "Internal server error" });
        }
        res.json({ items: results });
    });
});

app.post("/send-material", (req, res) => {
    const { material, quantity } = req.body;

    // Check if quantity is provided
    if (!material || !quantity) {
        return res.status(400).json({ error: "Invalid" });
    }

    // Update stocks table
    const updateQuery = `UPDATE additem SET quantity = quantity - ?`;

    connection.query(updateQuery, quantity, (err, result) => {
        if (err) {
            console.error("Error updating stocks table: " + err.stack);
            return res.status(500).json({ error: "Internal server error." });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "No rows updated." });
        }

        res.json({ message: "Material sent successfully." });
    });
});

app.get("/inwards", (req, res) => {
    connection.query(
        "SELECT SUM(quantity) as inwards FROM additem",
        (error, results) => {
            if (error) {
                console.error("Error fetching itemrs from database ,error.stack");
                return res.status(500).json({ error: "Internal server error" });
            }
            res.send(results);
        }
    );
});

app.get("/outwards", (req, res) => {
    connection.query(
        "SELECT SUM(quantity) as outwords FROM sendmaterial",
        (error, results) => {
            if (error) {
                console.error("Error fetching items from database ,error.stack");
                return res.status(500).json({ error: "Internal server error" });
            }
            res.json({ items: results });
        }
    );
});

function generatePDF(data) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: [595.28, 955.89] });
        const buffers = [];
        doc.on("data", (buffer) => buffers.push(buffer));
        doc.on("end", () => {
            const pdfData = Buffer.concat(buffers);
            resolve(pdfData);
        });
        data.forEach((row) => {
            doc.rect(50, 50, 514, 700).stroke();
            // doc.image('./C:/Users/broto/Downloads/BuildINT.png', 207, 55, { width: 200, height: 50 });
            doc.font("Times-Bold").fontSize(14).text("DELIVERY CHALLAN", 55, 115, {
                width: 504,
                height: 35,
                align: "left",
            });
            doc
                .font("Times-Bold")
                .fontSize(14)
                .text("Lightforce Buildint Pvt Ltd", 55, 130, {
                    width: 504,
                    height: 35,
                    align: "left",
                });
            doc
                .font("Times-Bold")
                .fontSize(10)
                .text("408-412, Srishti Palza, Off Saki Vihar Road,", 55, 145, {
                    width: 504,
                    height: 35,
                    align: "left",
                });
            doc
                .font("Times-Bold")
                .fontSize(10)
                .text("Powai, Mumbai 400072", 55, 160, {
                    width: 504,
                    height: 35,
                    align: "left",
                });
            doc.rect(50, 180, 514, 40).stroke();
            doc.font("Times-Bold").fontSize(25).text("Delivery Challan ", 165, 195, {
                width: 280,
                height: 5,
                align: "center",
            });
            doc.rect(50, 220, 257, 25).stroke();
            doc
                .font("Times-Bold")
                .fontSize(15)
                .text(`Challan Id :  ${row.challan_id}`, 55, 230, {
                    width: 280,
                    height: 5,
                    align: "left",
                });
            doc.rect(306, 220, 257, 25).stroke();
            doc.font("Times-Bold").fontSize(15).text("Challan Date:  ", 310, 230, {
                width: 280,
                height: 5,
                align: "left",
            });
            doc.rect(50, 245, 257, 25).stroke();
            doc
                .font("Times-Bold")
                .fontSize(15)
                .text(`Contact Person :  ${row.receiver_name}`, 55, 252, {
                    width: 280,
                    height: 5,
                    align: "left",
                });
            doc.rect(306, 245, 257, 25).stroke();
            doc
                .font("Times-Bold")
                .fontSize(15)
                .text(`Contact Number :  ${row.receiver_contact}`, 310, 252, {
                    width: 280,
                    height: 5,
                    align: "left",
                });
            doc.rect(50, 270, 257, 25).stroke();
            doc
                .font("Times-Bold")
                .fontSize(15)
                .text(`ATM ID :   ${row.site_id}`, 55, 275, {
                    width: 280,
                    height: 5,
                    align: "left",
                });
            doc.rect(306, 270, 257, 25).stroke();
            doc.font("Times-Bold").fontSize(15).text("HPY Code :  ", 310, 275, {
                width: 280,
                height: 5,
                align: "left",
            });
            doc.rect(50, 295, 257, 25).stroke();
            doc.font("Times-Bold").fontSize(15).text("Reverse Charge :  ", 55, 300, {
                width: 280,
                height: 5,
                align: "left",
            });
            doc.rect(306, 295, 257, 25).stroke();
            doc
                .font("Times-Bold")
                .fontSize(15)
                .text("Reverse Charge  :  ", 310, 300, {
                    width: 280,
                    height: 5,
                    align: "left",
                });
            doc.rect(50, 320, 257, 65).stroke();
            doc
                .font("Times-Bold")
                .fontSize(15)
                .text(`Billed To :  ${row.receiver_name}`, 55, 325, {
                    width: 280,
                    height: 5,
                    align: "left",
                });
            doc
                .font("Times-Bold")
                .fontSize(12)
                .text("Name :  ", 55, 345, { width: 280, height: 5, align: "left" });
            doc.rect(306, 320, 257, 65).stroke();
            doc
                .font("Times-Bold")
                .fontSize(15)
                .text(`Shipped To :  ${row.location}`, 310, 325, {
                    width: 280,
                    height: 5,
                    align: "left",
                });
            doc
                .font("Times-Bold")
                .fontSize(12)
                .text("Name :  ", 310, 345, { width: 280, height: 5, align: "left" });
            doc.rect(50, 385, 50, 25).stroke();
            doc
                .font("Times-Bold")
                .fontSize(10)
                .text("SR. NO:  ", 52, 395, { width: 280, height: 5, align: "left" });
            doc.rect(100, 385, 207, 25).stroke();
            doc
                .font("Times-Bold")
                .fontSize(10)
                .text(`Description of Goods:  ${row.material}`, 150, 395, {
                    width: 280,
                    height: 5,
                    align: "left",
                });
            doc.rect(306, 385, 50, 25).stroke();
            doc
                .font("Times-Bold")
                .fontSize(10)
                .text(`Qty  ${row.quantity}`, 315, 395, {
                    width: 280,
                    height: 5,
                    align: "left",
                });
            doc.rect(356, 385, 207, 25).stroke();
            doc.font("Times-Bold").fontSize(10).text("Approx Amount  ", 420, 395, {
                width: 280,
                height: 5,
                align: "left",
            });
            doc.rect(50, 410, 50, 150).stroke();
            doc.rect(100, 410, 207, 150).stroke();
            doc.rect(306, 410, 207, 150).stroke();
            doc.rect(356, 410, 207, 150).stroke();
            doc.rect(50, 560, 50, 20).stroke();
            doc.rect(100, 560, 207, 20).stroke();
            doc
                .font("Times-Bold")
                .fontSize(10)
                .text("Total:", 140, 565, { width: 280, height: 5, align: "center" });
            doc.rect(306, 560, 207, 20).stroke();
            doc.rect(356, 560, 207, 20).stroke();
            doc.rect(50, 580, 514, 30).stroke();
            doc
                .font("Times-Bold")
                .fontSize(10)
                .text(
                    "If any difference is found in quantity, quality and rate etc. it should be notified in writing withing 24 Hours. No claim will be entertained thereafter",
                    52,
                    585
                );
            doc
                .font("Times-Bold")
                .fontSize(10)
                .text("For LIGHTFORCE BUILDINT PRIVATE LIMITED", 52, 615);
            doc.font("Times-Bold").fontSize(10).text("Authorized Signatory", 52, 690);
            doc.font("Times-Bold").fontSize(10).text("Received By : ____", 250, 690, {
                width: 280,
                height: 5,
                align: "right",
            });
        });
        // Finalize the PDF and close the stream
        doc.end();
    });
}
app.get("/generatepdf", async (req, res) => {
    try {
        const { sendmaterial } = req.query;
        const query = "SELECT * FROM sendmaterial WHERE challan_id = ?";
        const values = [sendmaterial];
        const results = {};

        async function executeQuery(query, value, key) {
            return new Promise((resolve, reject) => {
                connection.query(query, value, (err, result) => {
                    if (err) {
                        reject(err);
                    } else {
                        results[key] = result;
                        resolve();
                    }
                });
            });
        }

        const promises = [executeQuery(query, values, "sendmaterial")];
        await Promise.all(promises);

        const data = results.sendmaterial;
        if (data.length === 0) {
            return res.status(404).json({ message: "No data found" });
        }

        const pdfData = await generatePDF(data);
        res.setHeader("Content-Disposition", 'attachment; filename="output.pdf"');
        res.setHeader("Content-Type", "application/pdf");
        res.status(200).end(pdfData);
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.get("/send-material-history", (req, res) => {
    connection.query("SELECT * FROM sendmaterial", (error, results) => {
        if (error) {
            console.error("Error fetching items from database ");
            return res.status(500).json({ error: "Internal server error" });
        }
        res.json({ history: results });
    });
});

app.get("/out-of-stock", (req, res) => {
    connection.query(
        "SELECT count(item_name) out_of_stock FROM inventory.additem where quantity = 0",
        (error, results) => {
            if (error) {
                console.error("Error fetching items from database ");
                return res.status(500).json({ error: "Internal server error" });
            }
            res.json({ Count: results });
        }
    );
});

app.get("/users", (req, res) => {
    connection.query(
        "SELECT count(*) as users FROM inventory.login",
        (error, results) => {
            if (error) {
                console.error("Error fetching items from database ");
                return res.status(500).json({ error: "Internal server error" });
            }
            res.json({ users: results });
        }
    );
});

app.post("/get-report", (req, res) => {
    console.log(req.body);
    const { in_out, site_details, product_name, from_date, to_date } = req.body;
    console.log(in_out);
    console.log(site_details);
    console.log(product_name);
    console.log(from_date);
    console.log(to_date);

    const query = ``;

    connection.query(
        "SELECT * FROM history where site_details = ? AND product_name =? AND in_out = ? AND date BETWEEN ? and ?;",
        [site_details, product_name, in_out, from_date, to_date],
        (error, results) => {
            if (error) {
                console.error("Error fetching items from database ");
                return res.status(500).json({ error: "Internal server error" });
            }
            res.json(results);
        }
    );
});

// Multer setup for file upload
const upload = multer({ dest: 'uploads/' });

// API endpoint to upload XLSX file
app.post('/upload', upload.single('file'), (req, res) => {
    const file = req.file;
    if (!file) {
        return res.status(400).send('No file uploaded.');
    }

    // Parse the XLSX file
    const workbook = xlsx.readFile(file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet);

    // Insert rows into the MySQL database
    rows.forEach(row => {
        const sql = `INSERT INTO stocks_test (
            item_id, item_name, make, mac_id, stock_holder_name, stock_holder_contact, stock_status, working_status, 
            rack, slot, added_date, supplier_id, item_status, project_name, cost, reciever_name, 
            reciever_contact, location, updated_date, chalan_id, description, m_o_d
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const values = [
            row.item_id, row.item_name, row.make, row.mac_id, row.stock_holder_name, row.stock_holder_contact, row.stock_status, row.working_status,
            row.rack, row.slot, row.added_date, row.supplier_id, row.item_status, row.project_name, row.cost, row.reciever_name,
            row.reciever_contact, row.location, row.updated_date, row.chalan_id, row.description, row.m_o_d
        ];

        connection.query(sql, values, (err) => {
            if (err) throw err;
        });
    });

    res.send('File uploaded and data inserted successfully.');
});

const port = process.env.PORT || 5050;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
