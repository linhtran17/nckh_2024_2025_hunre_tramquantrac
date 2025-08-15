require('dotenv').config();
const http = require('http');
const socketIo = require('socket.io');
const { sequelize, WeatherData } = require('./models');
const app = require('./app');

const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: [
            'http://10.0.2.2',
            'http://localhost',
            'http://127.0.0.1',
            'http://localhost:5173',
            'http://10.140.6.159',
            '*' // Tạm thời cho phép tất cả để test
        ],
        methods: ['GET', 'POST'],
        credentials: true,
    },
});

app.set('io', io);

const toLocalTime = (date) => {
    return new Date(date).toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' });
};

(async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Đã kết nối MySQL thành công!');
        await sequelize.sync({ alter: false });
        console.log('✅ Đã đồng bộ hóa cơ sở dữ liệu!');
    } catch (error) {
        console.error('❌ Kết nối DB thất bại:', error.message);
        process.exit(1);
    }
})();

io.on('error', (err) => {
    console.error('❌ Server WebSocket error:', err.message);
});

io.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id, socket.handshake.address);

    socket.on('error', (err) => {
        console.error('❌ WebSocket error:', err.message);
    });

    socket.emit('newWeatherData', {
        id: 1,
        station_id: 6,
        parameter_type: 'temperature',
        value: 25.5,
        created_at: toLocalTime(new Date()),
    });
    console.log('📤 Emitted sample newWeatherData to client:', socket.id);

    socket.on('requestInitialData', async (stationId) => {
        try {
            const parameterTypes = ['temperature', 'humidity', 'rainfall', 'wind'];
            for (const paramType of parameterTypes) {
                const weatherData = await WeatherData.findOne({
                    where: { station_id: stationId, parameter_type: paramType },
                    order: [['created_at', 'DESC']],
                });
                if (weatherData) {
                    const weatherDataJSON = weatherData.toJSON();
                    weatherDataJSON.created_at = toLocalTime(weatherDataJSON.created_at);
                    socket.emit('newWeatherData', weatherDataJSON);
                }
            }
        } catch (err) {
            console.error('❌ Error fetching initial data:', err.message);
        }
    });

    socket.on('esp32WeatherData', (data) => {
        try {
            const weatherDataJSON = {
                station_id: data.station_id,
                parameter_type: data.parameter_type,
                value: data.value,
                created_at: toLocalTime(new Date()),
            };
            WeatherData.create({
                station_id: data.station_id,
                parameter_type: data.parameter_type,
                value: data.value,
                created_at: new Date(),
            }).then(() => {
                console.log('✅ Saved weather data to DB');
                io.emit('newWeatherData', weatherDataJSON);
                console.log('📤 Emitted newWeatherData to all clients:', weatherDataJSON);
            }).catch(err => {
                console.error('❌ Error saving to DB:', err.message);
            });
        } catch (err) {
            console.error('❌ Invalid ESP32 data format:', err.message);
        }
    });

    socket.on('disconnect', () => {
        console.log('🔌 Client disconnected:', socket.id);
    });
});

app.post('/api/weather/esp32', async (req, res) => {
    try {
        const { station_id, parameter_type, value } = req.body;
        if (!station_id || !parameter_type || value === undefined) {
            return res.status(400).json({ error: 'Invalid data format' });
        }

        const weatherDataJSON = {
            station_id,
            parameter_type,
            value,
            created_at: toLocalTime(new Date()),
        };

        await WeatherData.create({
            station_id,
            parameter_type,
            value,
            created_at: new Date(),
        });

        io.emit('newWeatherData', weatherDataJSON);
        console.log('📤 Emitted newWeatherData from HTTP endpoint:', weatherDataJSON);

        res.status(200).json({ message: 'Data received and broadcasted' });
    } catch (error) {
        console.error('❌ Error in /api/weather/esp32:', error.message);
        res.status(500).json({ error: 'Server error' });
    }
});

const PORT = process.env.PORT || 3005;
server.listen(PORT, '0.0.0.0', () => { // Sử dụng 0.0.0.0 để tránh lỗi IP
    console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});