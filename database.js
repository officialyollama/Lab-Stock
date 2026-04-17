const Database = require('better-sqlite3');
const db = new Database('lab.db');

// Create tables
function createTables() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS Suppliers (
            Supplier_ID INTEGER PRIMARY KEY AUTOINCREMENT,
            Supplier_Name TEXT NOT NULL,
            Email TEXT,
            Contact_Number TEXT,
            Address TEXT,
            Created_At DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS Chemicals (
            Chemical_ID INTEGER PRIMARY KEY AUTOINCREMENT,
            Chemical_Name TEXT NOT NULL,
            Chemical_Type TEXT,
            Unit TEXT NOT NULL,
            Hazard_Level TEXT DEFAULT 'Low',
            Storage_Condition TEXT DEFAULT 'Room Temperature',
            Supplier_ID INTEGER,
            Created_At DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS Batches (
            Batch_ID INTEGER PRIMARY KEY AUTOINCREMENT,
            Chemical_ID INTEGER NOT NULL,
            Batch_Number TEXT NOT NULL,
            Manufacture_Date DATE,
            Expiry_Date DATE,
            Quantity_Received REAL NOT NULL,
            Unit_Price REAL,
            Created_At DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS Stock (
            Stock_ID INTEGER PRIMARY KEY AUTOINCREMENT,
            Chemical_ID INTEGER NOT NULL UNIQUE,
            Quantity_Available REAL DEFAULT 0.00,
            Threshold REAL DEFAULT 10.00,
            Last_Updated DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS Staff (
            Staff_ID INTEGER PRIMARY KEY AUTOINCREMENT,
            Staff_Name TEXT NOT NULL,
            Role TEXT NOT NULL,
            Email TEXT,
            Contact_Number TEXT,
            Profile_Pic TEXT DEFAULT 'https://ui-avatars.com/api/?name=User&background=6366f1&color=fff',
            Created_At DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS Stock_Transactions (
            Transaction_ID INTEGER PRIMARY KEY AUTOINCREMENT,
            Chemical_ID INTEGER NOT NULL,
            Batch_ID INTEGER,
            Staff_ID INTEGER,
            Transaction_Type TEXT NOT NULL,
            Quantity REAL NOT NULL,
            Transaction_Date DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    console.log('Database tables created ✅');
}

// Insert default data
function insertInitialData() {
    const row = db.prepare('SELECT COUNT(*) as count FROM Staff').get();

    if (row.count === 0) {
        console.log('Inserting default admin...');
        db.prepare(`
            INSERT INTO Staff (Staff_Name, Role, Email, Contact_Number)
            VALUES (?, ?, ?, ?)
        `).run('Default Admin', 'Inventory Manager', 'admin@lab.com', '555-0199');
    }
}

// Run setup
createTables();
insertInitialData();

module.exports = db;