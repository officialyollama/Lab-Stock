-- Laboratory Reagent & Chemical Stock Management System Database Schema

CREATE TABLE IF NOT EXISTS Suppliers (
    Supplier_ID INT AUTO_INCREMENT PRIMARY KEY,
    Supplier_Name VARCHAR(100) NOT NULL,
    Email VARCHAR(100),
    Contact_Number VARCHAR(20),
    Address TEXT,
    Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Chemicals (
    Chemical_ID INT AUTO_INCREMENT PRIMARY KEY,
    Chemical_Name VARCHAR(100) NOT NULL,
    Chemical_Type VARCHAR(50),
    Unit VARCHAR(20) NOT NULL,
    Hazard_Level ENUM('Low', 'Medium', 'High') DEFAULT 'Low',
    Storage_Condition ENUM('Room Temperature', 'Refrigerated', 'Dry Storage', 'Chemical Cabinet') DEFAULT 'Room Temperature',
    Supplier_ID INT,
    Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (Supplier_ID) REFERENCES Suppliers(Supplier_ID) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS Batches (
    Batch_ID INT AUTO_INCREMENT PRIMARY KEY,
    Chemical_ID INT NOT NULL,
    Batch_Number VARCHAR(50) NOT NULL,
    Manufacture_Date DATE,
    Expiry_Date DATE,
    Quantity_Received DECIMAL(10,2) NOT NULL,
    Unit_Price DECIMAL(10,2),
    Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (Chemical_ID) REFERENCES Chemicals(Chemical_ID) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Stock (
    Stock_ID INT AUTO_INCREMENT PRIMARY KEY,
    Chemical_ID INT NOT NULL UNIQUE,
    Quantity_Available DECIMAL(10,2) DEFAULT 0.00,
    Threshold DECIMAL(10,2) DEFAULT 10.00,
    Last_Updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (Chemical_ID) REFERENCES Chemicals(Chemical_ID) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Staff (
    Staff_ID INT AUTO_INCREMENT PRIMARY KEY,
    Staff_Name VARCHAR(100) NOT NULL,
    Role ENUM('Lab Technician', 'Researcher', 'Lab Manager', 'Inventory Manager') NOT NULL,
    Email VARCHAR(100),
    Contact_Number VARCHAR(20),
    Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Stock_Transactions (
    Transaction_ID INT AUTO_INCREMENT PRIMARY KEY,
    Chemical_ID INT NOT NULL,
    Batch_ID INT,
    Staff_ID INT,
    Transaction_Type ENUM('Purchase', 'Usage', 'Disposal', 'Transfer') NOT NULL,
    Quantity DECIMAL(10,2) NOT NULL,
    Transaction_Date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (Chemical_ID) REFERENCES Chemicals(Chemical_ID) ON DELETE CASCADE,
    FOREIGN KEY (Batch_ID) REFERENCES Batches(Batch_ID) ON DELETE SET NULL,
    FOREIGN KEY (Staff_ID) REFERENCES Staff(Staff_ID) ON DELETE SET NULL
);


INSERT INTO Suppliers (Supplier_Name, Email, Contact_Number, Address) VALUES 
('Supplier yollama', 'yollama@sigma.com', '1-800-325-3010', 'cleveland, MO, USA'),
('Fisher Scientific', 'service@thermofisher.com', '1-800-766-7000', 'Waltham, MA, USA');

INSERT INTO Staff (Staff_Name, Role, Email, Contact_Number) VALUES 
('Dr. Jane gulve', 'Lab Manager', 'jane.gulve@lab.com', '555-0101'),
('John Singh', 'Lab Technician', 'john.singh@lab.com', '555-0102');


INSERT INTO Chemicals (Chemical_Name, Chemical_Type, Unit, Hazard_Level, Storage_Condition, Supplier_ID) VALUES
('Ethanol 95%', 'Solvent', 'Liters', 'High', 'Chemical Cabinet', 1),
('Sodium Chloride', 'Salt', 'Grams', 'Low', 'Room Temperature', 2);


INSERT INTO Batches (Chemical_ID, Batch_Number, Manufacture_Date, Expiry_Date, Quantity_Received, Unit_Price) VALUES
(1, 'ETH-2023-01', '2023-01-10', '2028-01-10', 50.00, 15.50),
(2, 'NACL-2023-05', '2023-05-15', '2030-05-15', 5000.00, 0.05);


INSERT INTO Stock (Chemical_ID, Quantity_Available, Threshold) VALUES
(1, 50.00, 10.00),
(2, 5000.00, 1000.00);


INSERT INTO Stock_Transactions (Chemical_ID, Batch_ID, Staff_ID, Transaction_Type, Quantity) VALUES
(1, 1, 1, 'Purchase', 50.00),
(2, 2, 2, 'Purchase', 5000.00);
