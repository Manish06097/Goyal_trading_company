-- Create the companies table if it does not exist
CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT, -- Or SERIAL in PostgreSQL
    name VARCHAR(255) NOT NULL,
    logo VARCHAR(255), -- URL or path to logo image
    gst_number VARCHAR(50),
    pan_number VARCHAR(50),
    tan_number VARCHAR(50),
    address TEXT,
    phone_number VARCHAR(50),
    email VARCHAR(255),
    authorized_signature_image VARCHAR(255) -- URL or path to signature image
);

-- Add any other initial database setup here
