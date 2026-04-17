// server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database'); // This initializes the SQLite DB

const app = express();

app.use(cors());
app.use(express.json());



// Serve static frontend files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, '.')));

// ----------------------------------------------------
// Dashboard Stats API
// ----------------------------------------------------
app.get('/api/dashboard', (req, res) => {
    try {
        const stats = {
            total_chemicals: db.prepare("SELECT COUNT(*) as count FROM Chemicals").get().count,
            total_suppliers: db.prepare("SELECT COUNT(*) as count FROM Suppliers").get().count,
            low_stock: db.prepare("SELECT COUNT(*) as count FROM Stock WHERE Quantity_Available < Threshold").get().count,
            expiring_soon: db.prepare("SELECT COUNT(*) as count FROM Batches WHERE Expiry_Date BETWEEN date('now') AND date('now', '+30 days')").get().count,
            recent_activity: db.prepare(`SELECT t.Transaction_ID, c.Chemical_Name, t.Transaction_Type, t.Quantity, t.Transaction_Date 
                                FROM Stock_Transactions t 
                                JOIN Chemicals c ON t.Chemical_ID = c.Chemical_ID 
                                ORDER BY t.Transaction_Date DESC LIMIT 10`).all()
        };
        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ----------------------------------------------------
// Chemicals API
// ----------------------------------------------------
app.get('/api/chemicals', (req, res) => {
    try {
        const action = req.query.action;
        const search = req.query.search;

        if (action === 'expiring') {
            const rows = db.prepare(`SELECT c.Chemical_Name, b.Batch_Number, b.Expiry_Date, b.Quantity_Received 
                    FROM Batches b 
                    JOIN Chemicals c ON b.Chemical_ID = c.Chemical_ID 
                    WHERE b.Expiry_Date BETWEEN date('now') AND date('now', '+30 days')`).all();
            res.json(rows);
        } else if (action === 'low_stock') {
            const rows = db.prepare(`SELECT c.Chemical_Name, s.Quantity_Available, s.Threshold, c.Unit 
                    FROM Stock s 
                    JOIN Chemicals c ON s.Chemical_ID = c.Chemical_ID 
                    WHERE s.Quantity_Available < s.Threshold`).all();
            res.json(rows);
        } else {
            let query = `SELECT c.*, s.Supplier_Name 
                         FROM Chemicals c 
                         LEFT JOIN Suppliers s ON c.Supplier_ID = s.Supplier_ID`;
            let params = [];
            if (search) {
                query += " WHERE c.Chemical_Name LIKE ?";
                params.push(`%${search}%`);
            }
            const rows = db.prepare(query).all(params);
            res.json(rows);
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/chemicals', (req, res) => {
    try {
        const { Chemical_Name, Chemical_Type, Unit, Hazard_Level, Storage_Condition, Supplier_ID } = req.body;
        const info = db.prepare(
            `INSERT INTO Chemicals (Chemical_Name, Chemical_Type, Unit, Hazard_Level, Storage_Condition, Supplier_ID) VALUES (?, ?, ?, ?, ?, ?)`
        ).run(Chemical_Name, Chemical_Type, Unit, Hazard_Level, Storage_Condition, Supplier_ID || null);
        
        const chemId = info.lastInsertRowid;
        // Create default stock tracker
        db.prepare(`INSERT INTO Stock (Chemical_ID, Quantity_Available, Threshold) VALUES (?, 0, 10)`).run(chemId);
        res.json({ success: true, id: chemId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/chemicals', (req, res) => {
    try {
        const { Chemical_ID, Chemical_Name, Chemical_Type, Unit, Hazard_Level, Storage_Condition, Supplier_ID } = req.body;
        db.prepare(
            `UPDATE Chemicals SET Chemical_Name=?, Chemical_Type=?, Unit=?, Hazard_Level=?, Storage_Condition=?, Supplier_ID=? WHERE Chemical_ID=?`
        ).run(Chemical_Name, Chemical_Type, Unit, Hazard_Level, Storage_Condition, Supplier_ID || null, Chemical_ID);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/chemicals', (req, res) => {
    try {
        const { Chemical_ID } = req.body;
        db.prepare(`DELETE FROM Chemicals WHERE Chemical_ID=?`).run(Chemical_ID);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ----------------------------------------------------
// Suppliers API
// ----------------------------------------------------
app.get('/api/suppliers', (req, res) => {
    try {
        const rows = db.prepare("SELECT * FROM Suppliers ORDER BY Supplier_Name ASC").all();
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/suppliers', (req, res) => {
    try {
        const { Supplier_Name, Email, Contact_Number, Address } = req.body;
        const info = db.prepare("INSERT INTO Suppliers (Supplier_Name, Email, Contact_Number, Address) VALUES (?, ?, ?, ?)").run(Supplier_Name, Email, Contact_Number, Address);
        res.json({ success: true, id: info.lastInsertRowid });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/suppliers', (req, res) => {
    try {
        const { Supplier_ID, Supplier_Name, Email, Contact_Number, Address } = req.body;
        db.prepare("UPDATE Suppliers SET Supplier_Name=?, Email=?, Contact_Number=?, Address=? WHERE Supplier_ID=?").run(Supplier_Name, Email, Contact_Number, Address, Supplier_ID);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/suppliers', (req, res) => {
    try {
        const { Supplier_ID } = req.body;
        db.prepare("DELETE FROM Suppliers WHERE Supplier_ID=?").run(Supplier_ID);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// ----------------------------------------------------
// Staff / User Profile API
// ----------------------------------------------------
app.get('/api/staff', (req, res) => {
    try {
        const action = req.query.action;
        
        if (action === 'profile') {
            const row = db.prepare("SELECT * FROM Staff LIMIT 1").get();
            res.json(row);
        } else {
            const rows = db.prepare("SELECT * FROM Staff ORDER BY Staff_Name ASC").all();
            res.json(rows);
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/staff', (req, res) => {
    try {
        const { Staff_Name, Role, Email, Contact_Number } = req.body;
        const info = db.prepare("INSERT INTO Staff (Staff_Name, Role, Email, Contact_Number) VALUES (?, ?, ?, ?)").run(Staff_Name, Role, Email, Contact_Number);
        res.json({ success: true, id: info.lastInsertRowid });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/staff', (req, res) => {
    try {
        const { Staff_ID, Staff_Name, Role, Email, Contact_Number, Profile_Pic } = req.body;
        let query = "UPDATE Staff SET Staff_Name=?, Role=?, Email=?, Contact_Number=?";
        let params = [Staff_Name, Role, Email, Contact_Number];
        
        if (Profile_Pic) {
            query += ", Profile_Pic=?";
            params.push(Profile_Pic);
        }
        query += " WHERE Staff_ID=?";
        params.push(Staff_ID);

        db.prepare(query).run(params);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/staff', (req, res) => {
    try {
        const { Staff_ID } = req.body;
        db.prepare("DELETE FROM Staff WHERE Staff_ID=?").run(Staff_ID);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ----------------------------------------------------
// Inventory API (Batches, Stock, Transactions)
// ----------------------------------------------------
app.get('/api/inventory', (req, res) => {
    try {
        const action = req.query.action;
        
        if (action === 'batches') {
            const rows = db.prepare(`SELECT b.*, c.Chemical_Name 
                    FROM Batches b 
                    JOIN Chemicals c ON b.Chemical_ID = c.Chemical_ID 
                    ORDER BY b.Expiry_Date ASC`).all();
            res.json(rows);
        } else if (action === 'stock') {
            const rows = db.prepare(`SELECT s.*, c.Chemical_Name 
                    FROM Stock s 
                    JOIN Chemicals c ON s.Chemical_ID = c.Chemical_ID 
                    ORDER BY c.Chemical_Name ASC`).all();
            res.json(rows);
        } else if (action === 'transactions') {
            const rows = db.prepare(`SELECT t.*, c.Chemical_Name 
                    FROM Stock_Transactions t 
                    JOIN Chemicals c ON t.Chemical_ID = c.Chemical_ID 
                    ORDER BY t.Transaction_Date DESC`).all();
            res.json(rows);
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/inventory', (req, res) => {
    const action = req.query.action;
    const data = req.body;

    try {
        if (action === 'batch') {
            const createBatch = db.transaction((data) => {
                const info = db.prepare(`INSERT INTO Batches (Chemical_ID, Batch_Number, Manufacture_Date, Expiry_Date, Quantity_Received, Unit_Price) 
                        VALUES (?, ?, ?, ?, ?, ?)`).run(
                    data.Chemical_ID, data.Batch_Number, data.Manufacture_Date, data.Expiry_Date, data.Quantity, data.Unit_Price
                );
                
                const batchId = info.lastInsertRowid;
                const staffId = data.Staff_ID || 1;
                
                db.prepare(`INSERT INTO Stock_Transactions (Chemical_ID, Batch_ID, Staff_ID, Transaction_Type, Quantity) VALUES (?, ?, ?, 'Purchase', ?)`).run(
                    data.Chemical_ID, batchId, staffId, data.Quantity
                );
                
                db.prepare("UPDATE Stock SET Quantity_Available = Quantity_Available + ? WHERE Chemical_ID = ?").run(
                    data.Quantity, data.Chemical_ID
                );
            });

            createBatch(data);
            res.json({ success: true });

        } else if (action === 'transaction') {
            let qty = parseFloat(data.Quantity);
            let type = data.Transaction_Type;
            
            const row = db.prepare("SELECT Quantity_Available FROM Stock WHERE Chemical_ID = ?").get(data.Chemical_ID);
            
            if(type !== 'Purchase' && row && row.Quantity_Available < qty) {
                return res.status(400).json({ error: 'Insufficient stock for this transaction' });
            }

            const processTransaction = db.transaction((data, qty, type) => {
                const staffId = data.Staff_ID || 1;
                db.prepare(`INSERT INTO Stock_Transactions (Chemical_ID, Staff_ID, Transaction_Type, Quantity) VALUES (?, ?, ?, ?)`).run(
                    data.Chemical_ID, staffId, type, qty
                );
                
                const op = type === 'Purchase' ? '+' : '-';
                db.prepare(`UPDATE Stock SET Quantity_Available = Quantity_Available ${op} ? WHERE Chemical_ID = ?`).run(
                    qty, data.Chemical_ID
                );
            });

            processTransaction(data, qty, type);
            res.json({ success: true });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Any unmatched route sends the index.html (SPA routing behavior)
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Define PORT
const PORT = process.env.PORT || 3000;

// Start Server (KEEP THIS AT THE VERY END)
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
