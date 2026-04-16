// database.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to SQLite DB (creates file if it doesn't exist)
const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to SQLite:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        createTables();
    }
});

function createTables() {
    db.serialize(() => {
        // Suppliers Table
        db.run(`CREATE TABLE IF NOT EXISTS Suppliers (
            Supplier_ID INTEGER PRIMARY KEY AUTOINCREMENT,
            Supplier_Name TEXT NOT NULL,
            Email TEXT,
            Contact_Number TEXT,
            Address TEXT,
            Created_At DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Chemicals Table
        db.run(`CREATE TABLE IF NOT EXISTS Chemicals (
            Chemical_ID INTEGER PRIMARY KEY AUTOINCREMENT,
            Chemical_Name TEXT NOT NULL,
            Chemical_Type TEXT,
            Unit TEXT NOT NULL,
            Hazard_Level TEXT DEFAULT 'Low',
            Storage_Condition TEXT DEFAULT 'Room Temperature',
            Supplier_ID INTEGER,
            Created_At DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (Supplier_ID) REFERENCES Suppliers(Supplier_ID) ON DELETE SET NULL
        )`);

        // Batches Table
        db.run(`CREATE TABLE IF NOT EXISTS Batches (
            Batch_ID INTEGER PRIMARY KEY AUTOINCREMENT,
            Chemical_ID INTEGER NOT NULL,
            Batch_Number TEXT NOT NULL,
            Manufacture_Date DATE,
            Expiry_Date DATE,
            Quantity_Received REAL NOT NULL,
            Unit_Price REAL,
            Created_At DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (Chemical_ID) REFERENCES Chemicals(Chemical_ID) ON DELETE CASCADE
        )`);

        // Stock Table
        db.run(`CREATE TABLE IF NOT EXISTS Stock (
            Stock_ID INTEGER PRIMARY KEY AUTOINCREMENT,
            Chemical_ID INTEGER NOT NULL UNIQUE,
            Quantity_Available REAL DEFAULT 0.00,
            Threshold REAL DEFAULT 10.00,
            Last_Updated DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (Chemical_ID) REFERENCES Chemicals(Chemical_ID) ON DELETE CASCADE
        )`);

        // Staff Table (For regular lab users and User Profiles)
        db.run(`CREATE TABLE IF NOT EXISTS Staff (
            Staff_ID INTEGER PRIMARY KEY AUTOINCREMENT,
            Staff_Name TEXT NOT NULL,
            Role TEXT NOT NULL,
            Email TEXT,
            Contact_Number TEXT,
            Profile_Pic TEXT DEFAULT 'https://ui-avatars.com/api/?name=User&background=6366f1&color=fff',
            Created_At DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Stock Transactions Table
        db.run(`CREATE TABLE IF NOT EXISTS Stock_Transactions (
            Transaction_ID INTEGER PRIMARY KEY AUTOINCREMENT,
            Chemical_ID INTEGER NOT NULL,
            Batch_ID INTEGER,
            Staff_ID INTEGER,
            Transaction_Type TEXT NOT NULL,
            Quantity REAL NOT NULL,
            Transaction_Date DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (Chemical_ID) REFERENCES Chemicals(Chemical_ID) ON DELETE CASCADE,
            FOREIGN KEY (Batch_ID) REFERENCES Batches(Batch_ID) ON DELETE SET NULL,
            FOREIGN KEY (Staff_ID) REFERENCES Staff(Staff_ID) ON DELETE SET NULL
        )`);

        console.log('Database tables verified/created successfully.');
        insertInitialData();
    });
}

function insertInitialData() {
    // Check if Staff table is empty
    db.get('SELECT COUNT(*) as count FROM Staff', (err, row) => {
        if (row && row.count === 0) {
            console.log('Inserting initial mock user for Profile...');
            db.run(`INSERT INTO Staff (Staff_Name, Role, Email, Contact_Number) 
                    VALUES ('Default Admin', 'Inventory Manager', 'admin@labreagent.com', '555-0199')`);
        }
    });
}

module.exports = db;
