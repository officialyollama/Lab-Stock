// server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database'); // This initializes the SQLite DB

const app = express();
const port = process.env.PORT || 3000;
app.listen(port);
app.use(cors());
app.use(express.json());

// Serve static frontend files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, '.')));

// ----------------------------------------------------
// Dashboard Stats API
// ----------------------------------------------------
app.get('/api/dashboard', (req, res) => {
    let stats = {};
    
    db.get("SELECT COUNT(*) as count FROM Chemicals", [], (err, row) => {
        if(err) return res.status(500).json({ error: err.message });
        stats.total_chemicals = row.count;
        
        db.get("SELECT COUNT(*) as count FROM Suppliers", [], (err, row) => {
            if(err) return res.status(500).json({ error: err.message });
            stats.total_suppliers = row.count;
            
            db.get("SELECT COUNT(*) as count FROM Stock WHERE Quantity_Available < Threshold", [], (err, row) => {
                if(err) return res.status(500).json({ error: err.message });
                stats.low_stock = row.count;
                
                db.get("SELECT COUNT(*) as count FROM Batches WHERE Expiry_Date BETWEEN date('now') AND date('now', '+30 days')", [], (err, row) => {
                    if(err) return res.status(500).json({ error: err.message });
                    stats.expiring_soon = row.count;

                    db.all(`SELECT t.Transaction_ID, c.Chemical_Name, t.Transaction_Type, t.Quantity, t.Transaction_Date 
                            FROM Stock_Transactions t 
                            JOIN Chemicals c ON t.Chemical_ID = c.Chemical_ID 
                            ORDER BY t.Transaction_Date DESC LIMIT 10`, [], (err, rows) => {
                        if(err) return res.status(500).json({ error: err.message });
                        stats.recent_activity = rows;
                        res.json(stats);
                    });
                });
            });
        });
    });
});

// ----------------------------------------------------
// Chemicals API
// ----------------------------------------------------
app.get('/api/chemicals', (req, res) => {
    const action = req.query.action;
    const search = req.query.search;

    if (action === 'expiring') {
        db.all(`SELECT c.Chemical_Name, b.Batch_Number, b.Expiry_Date, b.Quantity_Received 
                FROM Batches b 
                JOIN Chemicals c ON b.Chemical_ID = c.Chemical_ID 
                WHERE b.Expiry_Date BETWEEN date('now') AND date('now', '+30 days')`, [], (err, rows) => {
            if(err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    } else if (action === 'low_stock') {
        db.all(`SELECT c.Chemical_Name, s.Quantity_Available, s.Threshold, c.Unit 
                FROM Stock s 
                JOIN Chemicals c ON s.Chemical_ID = c.Chemical_ID 
                WHERE s.Quantity_Available < s.Threshold`, [], (err, rows) => {
            if(err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    } else {
        let query = `SELECT c.*, s.Supplier_Name 
                     FROM Chemicals c 
                     LEFT JOIN Suppliers s ON c.Supplier_ID = s.Supplier_ID`;
        let params = [];
        if (search) {
            query += " WHERE c.Chemical_Name LIKE ?";
            params.push(`%${search}%`);
        }
        db.all(query, params, (err, rows) => {
            if(err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    }
});

app.post('/api/chemicals', (req, res) => {
    const { Chemical_Name, Chemical_Type, Unit, Hazard_Level, Storage_Condition, Supplier_ID } = req.body;
    db.run(
        `INSERT INTO Chemicals (Chemical_Name, Chemical_Type, Unit, Hazard_Level, Storage_Condition, Supplier_ID) VALUES (?, ?, ?, ?, ?, ?)`,
        [Chemical_Name, Chemical_Type, Unit, Hazard_Level, Storage_Condition, Supplier_ID || null],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            const chemId = this.lastID;
            // Create default stock tracker
            db.run(`INSERT INTO Stock (Chemical_ID, Quantity_Available, Threshold) VALUES (?, 0, 10)`, [chemId]);
            res.json({ success: true, id: chemId });
        }
    );
});

app.put('/api/chemicals', (req, res) => {
    const { Chemical_ID, Chemical_Name, Chemical_Type, Unit, Hazard_Level, Storage_Condition, Supplier_ID } = req.body;
    db.run(
        `UPDATE Chemicals SET Chemical_Name=?, Chemical_Type=?, Unit=?, Hazard_Level=?, Storage_Condition=?, Supplier_ID=? WHERE Chemical_ID=?`,
        [Chemical_Name, Chemical_Type, Unit, Hazard_Level, Storage_Condition, Supplier_ID || null, Chemical_ID],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

app.delete('/api/chemicals', (req, res) => {
    const { Chemical_ID } = req.body;
    db.run(`DELETE FROM Chemicals WHERE Chemical_ID=?`, [Chemical_ID], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// ----------------------------------------------------
// Suppliers API
// ----------------------------------------------------
app.get('/api/suppliers', (req, res) => {
    db.all("SELECT * FROM Suppliers ORDER BY Supplier_Name ASC", [], (err, rows) => {
        if(err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/suppliers', (req, res) => {
    const { Supplier_Name, Email, Contact_Number, Address } = req.body;
    db.run("INSERT INTO Suppliers (Supplier_Name, Email, Contact_Number, Address) VALUES (?, ?, ?, ?)",
        [Supplier_Name, Email, Contact_Number, Address], function(err) {
            if(err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id: this.lastID });
    });
});

app.put('/api/suppliers', (req, res) => {
    const { Supplier_ID, Supplier_Name, Email, Contact_Number, Address } = req.body;
    db.run("UPDATE Suppliers SET Supplier_Name=?, Email=?, Contact_Number=?, Address=? WHERE Supplier_ID=?",
        [Supplier_Name, Email, Contact_Number, Address, Supplier_ID], function(err) {
            if(err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
    });
});

app.delete('/api/suppliers', (req, res) => {
    const { Supplier_ID } = req.body;
    db.run("DELETE FROM Suppliers WHERE Supplier_ID=?", [Supplier_ID], function(err) {
        if(err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});


// ----------------------------------------------------
// Staff / User Profile API
// ----------------------------------------------------
app.get('/api/staff', (req, res) => {
    const action = req.query.action;
    
    if (action === 'profile') {
        // Return the first staff member as the "Logged In Profile"
        db.get("SELECT * FROM Staff LIMIT 1", [], (err, row) => {
            if(err) return res.status(500).json({ error: err.message });
            res.json(row);
        });
    } else {
        db.all("SELECT * FROM Staff ORDER BY Staff_Name ASC", [], (err, rows) => {
            if(err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    }
});

app.post('/api/staff', (req, res) => {
    const { Staff_Name, Role, Email, Contact_Number } = req.body;
    db.run("INSERT INTO Staff (Staff_Name, Role, Email, Contact_Number) VALUES (?, ?, ?, ?)",
        [Staff_Name, Role, Email, Contact_Number], function(err) {
            if(err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id: this.lastID });
    });
});

app.put('/api/staff', (req, res) => {
    const { Staff_ID, Staff_Name, Role, Email, Contact_Number, Profile_Pic } = req.body;
    // Handle both staff management updates AND User profile updates
    let query = "UPDATE Staff SET Staff_Name=?, Role=?, Email=?, Contact_Number=?";
    let params = [Staff_Name, Role, Email, Contact_Number];
    
    if (Profile_Pic) {
        query += ", Profile_Pic=?";
        params.push(Profile_Pic);
    }
    query += " WHERE Staff_ID=?";
    params.push(Staff_ID);

    db.run(query, params, function(err) {
            if(err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
    });
});

app.delete('/api/staff', (req, res) => {
    const { Staff_ID } = req.body;
    db.run("DELETE FROM Staff WHERE Staff_ID=?", [Staff_ID], function(err) {
        if(err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// ----------------------------------------------------
// Inventory API (Batches, Stock, Transactions)
// ----------------------------------------------------
app.get('/api/inventory', (req, res) => {
    const action = req.query.action;
    
    if (action === 'batches') {
        db.all(`SELECT b.*, c.Chemical_Name 
                FROM Batches b 
                JOIN Chemicals c ON b.Chemical_ID = c.Chemical_ID 
                ORDER BY b.Expiry_Date ASC`, [], (err, rows) => {
            if(err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    } else if (action === 'stock') {
        db.all(`SELECT s.*, c.Chemical_Name 
                FROM Stock s 
                JOIN Chemicals c ON s.Chemical_ID = c.Chemical_ID 
                ORDER BY c.Chemical_Name ASC`, [], (err, rows) => {
            if(err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    } else if (action === 'transactions') {
        db.all(`SELECT t.*, c.Chemical_Name 
                FROM Stock_Transactions t 
                JOIN Chemicals c ON t.Chemical_ID = c.Chemical_ID 
                ORDER BY t.Transaction_Date DESC`, [], (err, rows) => {
            if(err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    }
});

app.post('/api/inventory', (req, res) => {
    const action = req.query.action;
    const data = req.body;

    if (action === 'batch') {
        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            db.run(`INSERT INTO Batches (Chemical_ID, Batch_Number, Manufacture_Date, Expiry_Date, Quantity_Received, Unit_Price) 
                    VALUES (?, ?, ?, ?, ?, ?)`,
                [data.Chemical_ID, data.Batch_Number, data.Manufacture_Date, data.Expiry_Date, data.Quantity, data.Unit_Price],
                function(err) {
                    if(err) { db.run("ROLLBACK"); return res.status(500).json({ error: err.message }); }
                    
                    const batchId = this.lastID;
                    const staffId = data.Staff_ID || 1;
                    
                    db.run(`INSERT INTO Stock_Transactions (Chemical_ID, Batch_ID, Staff_ID, Transaction_Type, Quantity) VALUES (?, ?, ?, 'Purchase', ?)`,
                        [data.Chemical_ID, batchId, staffId, data.Quantity], (err) => {
                            if(err) { db.run("ROLLBACK"); return res.status(500).json({ error: err.message }); }
                            
                            db.run("UPDATE Stock SET Quantity_Available = Quantity_Available + ? WHERE Chemical_ID = ?",
                                [data.Quantity, data.Chemical_ID], (err) => {
                                    if(err) { db.run("ROLLBACK"); return res.status(500).json({ error: err.message }); }
                                    
                                    db.run("COMMIT");
                                    res.json({ success: true });
                            });
                    });
            });
        });
    } else if (action === 'transaction') {
        let qty = parseFloat(data.Quantity);
        let type = data.Transaction_Type;
        
        db.get("SELECT Quantity_Available FROM Stock WHERE Chemical_ID = ?", [data.Chemical_ID], (err, row) => {
            if(err) return res.status(500).json({ error: err.message });
            if(type !== 'Purchase' && row && row.Quantity_Available < qty) {
                return res.status(400).json({ error: 'Insufficient stock for this transaction' });
            }

            db.serialize(() => {
                db.run("BEGIN TRANSACTION");
                
                const staffId = data.Staff_ID || 1;
                db.run(`INSERT INTO Stock_Transactions (Chemical_ID, Staff_ID, Transaction_Type, Quantity) VALUES (?, ?, ?, ?)`,
                    [data.Chemical_ID, staffId, type, qty], (err) => {
                        if(err) { db.run("ROLLBACK"); return res.status(500).json({ error: err.message }); }
                        
                        const op = type === 'Purchase' ? '+' : '-';
                        db.run(`UPDATE Stock SET Quantity_Available = Quantity_Available ${op} ? WHERE Chemical_ID = ?`,
                            [qty, data.Chemical_ID], (err) => {
                                if(err) { db.run("ROLLBACK"); return res.status(500).json({ error: err.message }); }
                                
                                db.run("COMMIT");
                                res.json({ success: true });
                        });
                });
            });
        });
    }
});

// Any unmatched route sends the index.html (SPA routing behavior)
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
