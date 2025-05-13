require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const db = require('pg-promise')();
const swaggerUi = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');

const app = express();
const port = process.env.PORT || 3000;  // Ensure fallback to 3000
const host = process.env.HOST;

const dbConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
};

const database = db(dbConfig);

const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
      title: 'Device Management API',
      version: '1.0.0',
      description: 'API for managing devices',
    },
    servers: [
      { url: `http://localhost:${port}` },
    ],
};

const swaggerOptions = {
    swaggerDefinition,
    apis: [__filename],
};

const swaggerSpec = swaggerJsDoc(swaggerOptions);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(bodyParser.json());

database.connect()
    .then(obj => {
        console.log('Connected to PostgreSQL');
        obj.done();  
    })
    .catch(error => {
        console.error('Error connecting to PostgreSQL:', error.message);
        process.exit(1);  
    });

// POST /register - реєстрація пристрою
/**
 * @swagger
 * /register:
 *   post:
 *     description: Register a new device
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               device_name:
 *                 type: string
 *               serial_number:
 *                 type: string
 *     responses:
 *       200:
 *         description: Device registered successfully
 *       400:
 *         description: Device already registered or invalid input
 *       500:
 *         description: Server error
 */
app.post('/register', async (req, res) => {
    if (!req.body || !req.body.device_name || !req.body.serial_number) {
        return res.status(400).json({ message: 'Request body must contain device_name and serial_number' });
    }

    const { device_name, serial_number } = req.body;

    // Validation
    if (!device_name || !serial_number || typeof device_name !== 'string' || typeof serial_number !== 'string') {
        return res.status(400).json({ message: 'Invalid input data' });
    }

    try {
        const existingDevice = await database.oneOrNone('SELECT * FROM devices WHERE serial_number = $1', [serial_number]);

        if (existingDevice) {
            return res.status(400).json({ message: 'Device already registered' });
        }

        const newDevice = await database.one(
            'INSERT INTO devices (device_name, serial_number) VALUES ($1, $2) RETURNING device_name, serial_number',
            [device_name, serial_number]
        );

        res.status(200).json(newDevice);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /devices - отримання списку пристроїв
/**
 * @swagger
 * /devices:
 *   get:
 *     description: Get a list of all devices
 *     responses:
 *       200:
 *         description: A list of devices
 *       500:
 *         description: Server error
 */
app.get('/devices', async (req, res) => {
    try {
        const devices = await database.any('SELECT device_name, serial_number FROM devices');
        res.status(200).json(devices);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /take - взяття пристрою у користування
/**
 * @swagger
 * /take:
 *   post:
 *     description: Take a device for usage
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user_name:
 *                 type: string
 *               serial_number:
 *                 type: string
 *     responses:
 *       200:
 *         description: Device assigned successfully
 *       400:
 *         description: Device already taken or invalid input
 *       404:
 *         description: Device not found
 *       500:
 *         description: Server error
 */
app.post('/take', async (req, res) => {
    if (!req.body || !req.body.user_name || !req.body.serial_number) {
        return res.status(400).json({ message: 'Request body must contain user_name and serial_number' });
    }

    const { user_name, serial_number } = req.body;

    // Validation
    if (!user_name || !serial_number || typeof user_name !== 'string' || typeof serial_number !== 'string') {
        return res.status(400).json({ message: 'Invalid input data' });
    }

    try {
        const device = await database.oneOrNone('SELECT * FROM devices WHERE serial_number = $1', [serial_number]);

        if (!device) {
            return res.status(404).json({ message: 'Device not found' });
        }

        if (device.user_name) {
            return res.status(400).json({ message: 'Device already taken' });
        }

        const updatedDevice = await database.one(
            'UPDATE devices SET user_name = $1 WHERE serial_number = $2 RETURNING device_name, serial_number, user_name',
            [user_name, serial_number]
        );

        res.status(200).json(updatedDevice);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /devices/:serial_number - отримання інформації про пристрій
/**
 * @swagger
 * /devices/{serial_number}:
 *   get:
 *     description: Get information about a device by serial number
 *     parameters:
 *       - name: serial_number
 *         in: path
 *         required: true
 *         description: The serial number of the device
 *     responses:
 *       200:
 *         description: Device details
 *       404:
 *         description: Device not found
 *       500:
 *         description: Server error
 */
app.get('/devices/:serial_number', async (req, res) => {
    const { serial_number } = req.params;

    try {
        const device = await database.oneOrNone('SELECT device_name, user_name FROM devices WHERE serial_number = $1', [serial_number]);

        if (!device) {
            return res.status(404).json({ message: 'Device not found' });
        }

        res.status(200).json(device);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /devices/:serial_number - видалення пристрою
/**
 * @swagger
 * /devices/{serial_number}:
 *   delete:
 *     description: Delete a device by serial number
 *     parameters:
 *       - name: serial_number
 *         in: path
 *         required: true
 *         description: The serial number of the device to delete
 *     responses:
 *       200:
 *         description: Device deleted successfully
 *       404:
 *         description: Device not found
 *       500:
 *         description: Server error
 */
app.delete('/devices/:serial_number', async (req, res) => {
    const { serial_number } = req.params;

    try {
        // Check if the device exists
        const device = await database.oneOrNone('SELECT * FROM devices WHERE serial_number = $1', [serial_number]);

        if (!device) {
            return res.status(404).json({ message: 'Device not found' });
        }

        // Delete the device
        await database.none('DELETE FROM devices WHERE serial_number = $1', [serial_number]);

        res.status(200).json({ message: 'Device deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /release/:serial_number - звільнення пристрою (видалення користувача)
 /**
 * @swagger
 * /release/{serial_number}:
 *   delete:
 *     description: Release a device (remove assigned user)
 *     parameters:
 *       - name: serial_number
 *         in: path
 *         required: true
 *         description: The serial number of the device to be released
 *     responses:
 *       200:
 *         description: Device released successfully
 *       404:
 *         description: Device not found
 *       400:
 *         description: Device not assigned to any user
 *       500:
 *         description: Server error
 */
 app.delete('/release/:serial_number', async (req, res) => {
    const { serial_number } = req.params; // Get serial_number from the URL path

    try {
        const device = await database.oneOrNone('SELECT * FROM devices WHERE serial_number = $1', [serial_number]);

        if (!device) {
            return res.status(404).json({ message: 'Device not found' });
        }

        // If the device is not assigned to any user
        if (!device.user_name) {
            return res.status(400).json({ message: 'Device is not assigned to any user' });
        }

        // Remove the user from the device (release it)
        const updatedDevice = await database.one(
            'UPDATE devices SET user_name = NULL WHERE serial_number = $1 RETURNING device_name, serial_number, user_name',
            [serial_number]
        );

        res.status(200).json({ message: 'Device released successfully', device: updatedDevice });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});



// 404 handler
app.use((req, res) => {
    res.status(404).send('Not found');
  });
  
// error handler
app.use((err, req, res, next) => {
    if (err instanceof URIError) {
      return res.status(400).json({ message: 'Bad URI Encoding' });
    }
    console.error('Unhandled error:', err);
    res.status(500).json({ message: 'Server error' });
 });

 app.listen(port, () => {
     console.log(`Server running on http://${host}:${port}`);
 });