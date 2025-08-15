<template>
  <div class="early-warning">
    <h2>Cảnh báo sớm dựa trên xu hướng - Trạm 6</h2>

    <!-- Lấy dữ liệu lịch sử -->
    <div class="data-section">
      <button @click="fetchRecentData" :disabled="isFetching">
        {{ isFetching ? 'Đang lấy dữ liệu...' : 'Lấy dữ liệu 24 giờ gần nhất' }}
      </button>

      <div v-if="historicalData.rainfall.length > 0" class="data-preview">
        <p>Lượng mưa gần nhất: {{ historicalData.rainfall[historicalData.rainfall.length - 1].toFixed(2) }} mm/h</p>
        <p>Tốc độ gió gần nhất: {{ historicalData.wind[historicalData.wind.length - 1].toFixed(2) }} m/s</p>
        <p>Nhiệt độ gần nhất: {{ historicalData.temperature[historicalData.temperature.length - 1].toFixed(2) }} °C</p>
        <p>Độ ẩm gần nhất: {{ historicalData.humidity[historicalData.humidity.length - 1].toFixed(2) }} %</p>
      </div>
    </div>

    <!-- Dự đoán và cảnh báo -->
    <div class="prediction-section">
      <button @click="predictAndAlert" :disabled="isPredicting || historicalData.rainfall.length === 0">
        {{ isPredicting ? 'Đang dự đoán...' : 'Dự đoán xu hướng 1 giờ tới' }}
      </button>

      <!-- Hiển thị xu hướng và cảnh báo -->
      <div v-if="trendData.rainfall !== null" class="trend-result">
        <h3>Xu hướng 1 giờ tới</h3>
        <div class="trend-item">
          <p>Lượng mưa: {{ trendData.rainfall.toFixed(2) }} mm/h - 
            <span :class="trendData.rainfallTrend === 'Tăng mạnh' ? 'trend-up' : trendData.rainfallTrend === 'Giảm' ? 'trend-down' : 'trend-stable'">
              {{ trendData.rainfallTrend }}
            </span>
          </p>
        </div>
        <div class="trend-item">
          <p>Tốc độ gió: {{ trendData.wind.toFixed(2) }} m/s - 
            <span :class="trendData.windTrend === 'Tăng mạnh' ? 'trend-up' : trendData.windTrend === 'Giảm' ? 'trend-down' : 'trend-stable'">
              {{ trendData.windTrend }}
            </span>
          </p>
        </div>
        <div class="trend-item">
          <p>Nhiệt độ: {{ trendData.temperature.toFixed(2) }} °C - 
            <span :class="trendData.temperatureTrend === 'Tăng mạnh' ? 'trend-up' : trendData.temperatureTrend === 'Giảm mạnh' ? 'trend-down' : 'trend-stable'">
              {{ trendData.temperatureTrend }}
            </span>
          </p>
        </div>
        <div class="trend-item">
          <p>Độ ẩm: {{ trendData.humidity.toFixed(2) }} % - 
            <span :class="trendData.humidityTrend === 'Tăng' ? 'trend-up' : trendData.humidityTrend === 'Giảm' ? 'trend-down' : 'trend-stable'">
              {{ trendData.humidityTrend }}
            </span>
          </p>
        </div>
        <div v-if="trendData.alert" class="alert">
          <h4>Cảnh báo: {{ trendData.alert }}</h4>
        </div>
      </div>

      <!-- Biểu đồ xu hướng -->
      <div v-if="trendData.rainfall !== null" class="chart-container">
        <h3>Biểu đồ xu hướng</h3>
        <LineChart :chart-data="trendChartData" :options="chartOptions" />
      </div>

      <div v-if="predictionError" class="error">
        Lỗi dự đoán: {{ predictionError }}
      </div>
    </div>
  </div>
</template>

<script>
import { Line } from 'vue-chartjs';
import { Chart as ChartJS, Title, Tooltip, Legend, LineElement, CategoryScale, LinearScale, PointElement } from 'chart.js';
import axios from 'axios';

ChartJS.register(Title, Tooltip, Legend, LineElement, CategoryScale, LinearScale, PointElement);

export default {
  name: 'EarlyWarning',
  components: {
    LineChart: Line
  },
  data() {
    return {
      historicalData: {
        rainfall: [],
        wind: [],
        temperature: [],
        humidity: []
      },
      inputData: [],
      trendData: {
        rainfall: null,
        wind: null,
        temperature: null,
        humidity: null,
        rainfallTrend: '',
        windTrend: '',
        temperatureTrend: '',
        humidityTrend: '',
        alert: ''
      },
      isFetching: false,
      isPredicting: false,
      predictionError: null,
      chartOptions: {
        responsive: true,
        plugins: {
          legend: { position: 'top' },
          title: { display: true, text: 'Xu hướng các thông số thời tiết' }
        },
        scales: {
          x: { title: { display: true, text: 'Thời gian (giờ trước và dự đoán)' } },
          y: { title: { display: true, text: 'Giá trị' }, beginAtZero: true }
        }
      }
    };
  },
  computed: {
    trendChartData() {
      if (this.historicalData.rainfall.length === 0) {
        return { labels: [], datasets: [] };
      }

      const labels = [...Array(24).keys()].map(i => `-${23 - i}`).concat(['+1']);
      return {
        labels: labels,
        datasets: [
          {
            label: 'Lượng mưa (mm/h)',
            data: [...this.historicalData.rainfall, this.trendData.rainfall],
            borderColor: 'rgba(255, 99, 132, 1)',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            fill: false,
            tension: 0.1,
            borderDash: labels.map((_, i) => i === 24 ? [5, 5] : [])
          },
          {
            label: 'Tốc độ gió (m/s)',
            data: [...this.historicalData.wind, this.trendData.wind],
            borderColor: 'rgba(54, 162, 235, 1)',
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            fill: false,
            tension: 0.1,
            borderDash: labels.map((_, i) => i === 24 ? [5, 5] : [])
          },
          {
            label: 'Nhiệt độ (°C)',
            data: [...this.historicalData.temperature, this.trendData.temperature],
            borderColor: 'rgba(255, 206, 86, 1)',
            backgroundColor: 'rgba(255, 206, 86, 0.2)',
            fill: false,
            tension: 0.1,
            borderDash: labels.map((_, i) => i === 24 ? [5, 5] : [])
          },
          {
            label: 'Độ ẩm (%)',
            data: [...this.historicalData.humidity, this.trendData.humidity],
            borderColor: 'rgba(75, 192, 192, 1)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            fill: false,
            tension: 0.1,
            borderDash: labels.map((_, i) => i === 24 ? [5, 5] : [])
          }
        ]
      };
    }
  },
  methods: {
async fetchRecentData() {
  this.isFetching = true;
  this.historicalData = { rainfall: [], wind: [], temperature: [], humidity: [] };
  this.inputData = [];

  try {
    const parameters = ['rainfall', 'wind', 'temperature', 'humidity'];
    const recentDataPromises = parameters.map(param =>
      axios.get('http://localhost:3005/api/weather/filter-by-time-range', {
        params: {
          station_id: 6,
          range: 'last24hours', // Sửa từ 'current' thành 'last24hours'
          parameter_type: param
        }
      })
    );

    const responses = await Promise.all(recentDataPromises);
    const recentData = responses.map(res => res.data);

    this.inputData = [];
    for (let i = 0; i < 24; i++) {
      const row = parameters.map((_, idx) => {
        const paramData = recentData[idx];
        return paramData[i] ? paramData[i].value : 0;
      });
      this.inputData.push(row);
    }

    this.historicalData.rainfall = recentData[0].map(item => item.value);
    this.historicalData.wind = recentData[1].map(item => item.value);
    this.historicalData.temperature = recentData[2].map(item => item.value);
    this.historicalData.humidity = recentData[3].map(item => item.value);
  } catch (error) {
    console.error('Lỗi khi lấy dữ liệu gần nhất:', error);
    this.predictionError = error.response?.data?.error || 'Không thể lấy dữ liệu lịch sử';
  } finally {
    this.isFetching = false;
  }
},
    async predictAndAlert() {
      this.isPredicting = true;
      this.trendData = {
        rainfall: null,
        wind: null,
        temperature: null,
        humidity: null,
        rainfallTrend: '',
        windTrend: '',
        temperatureTrend: '',
        humidityTrend: '',
        alert: ''
      };
      this.predictionError = null;

      try {
        // Kiểm tra dữ liệu đầu vào
        if (this.inputData.length !== 24 || this.inputData[0].length !== 4) {
          throw new Error('Dữ liệu đầu vào không hợp lệ. Cần 24 giờ với 4 thông số.');
        }

        // Gọi API để dự đoán cả 4 thông số
        const response = await axios.post('http://localhost:5002/predict/all', {
          data: this.inputData
        });

        // Cập nhật dữ liệu xu hướng từ API
        this.trendData.rainfall = response.data.predicted_rainfall;
        this.trendData.wind = response.data.predicted_wind;
        this.trendData.temperature = response.data.predicted_temperature;
        this.trendData.humidity = response.data.predicted_humidity;

        // Phân tích xu hướng
        this.analyzeTrends();

        // Kiểm tra và gửi cảnh báo
        this.generateAlerts();
      } catch (error) {
        console.error('Lỗi khi dự đoán:', error);
        this.predictionError = error.response?.data?.error || 'Không thể dự đoán';
      } finally {
        this.isPredicting = false;
      }
    },
    analyzeTrends() {
      // Lượng mưa
      const lastRainfall = this.historicalData.rainfall[this.historicalData.rainfall.length - 1];
      const rainfallChangePercent = lastRainfall !== 0 ? ((this.trendData.rainfall - lastRainfall) / lastRainfall) * 100 : 0;
      if (rainfallChangePercent > 50) this.trendData.rainfallTrend = 'Tăng mạnh';
      else if (rainfallChangePercent < -50) this.trendData.rainfallTrend = 'Giảm mạnh';
      else if (rainfallChangePercent > 10) this.trendData.rainfallTrend = 'Tăng';
      else if (rainfallChangePercent < -10) this.trendData.rainfallTrend = 'Giảm';
      else this.trendData.rainfallTrend = 'Ổn định';

      // Tốc độ gió
      const lastWind = this.historicalData.wind[this.historicalData.wind.length - 1];
      const windChangePercent = lastWind !== 0 ? ((this.trendData.wind - lastWind) / lastWind) * 100 : 0;
      if (windChangePercent > 30) this.trendData.windTrend = 'Tăng mạnh';
      else if (windChangePercent < -30) this.trendData.windTrend = 'Giảm mạnh';
      else if (windChangePercent > 10) this.trendData.windTrend = 'Tăng';
      else if (windChangePercent < -10) this.trendData.windTrend = 'Giảm';
      else this.trendData.windTrend = 'Ổn định';

      // Nhiệt độ
      const lastTemperature = this.historicalData.temperature[this.historicalData.temperature.length - 1];
      const tempChangePercent = lastTemperature !== 0 ? ((this.trendData.temperature - lastTemperature) / lastTemperature) * 100 : 0;
      if (tempChangePercent > 10) this.trendData.temperatureTrend = 'Tăng mạnh';
      else if (tempChangePercent < -10) this.trendData.temperatureTrend = 'Giảm mạnh';
      else if (tempChangePercent > 5) this.trendData.temperatureTrend = 'Tăng';
      else if (tempChangePercent < -5) this.trendData.temperatureTrend = 'Giảm';
      else this.trendData.temperatureTrend = 'Ổn định';

      // Độ ẩm
      const lastHumidity = this.historicalData.humidity[this.historicalData.humidity.length - 1];
      const humidityChangePercent = lastHumidity !== 0 ? ((this.trendData.humidity - lastHumidity) / lastHumidity) * 100 : 0;
      if (humidityChangePercent > 10) this.trendData.humidityTrend = 'Tăng';
      else if (humidityChangePercent < -10) this.trendData.humidityTrend = 'Giảm';
      else this.trendData.humidityTrend = 'Ổn định';
    },
    generateAlerts() {
      let alerts = [];

      // Lượng mưa
      if (this.trendData.rainfall > 5) {
        alerts.push('Nguy cơ ngập lụt: Lượng mưa vượt ngưỡng 5 mm/h');
      } else if (this.trendData.rainfallTrend === 'Tăng mạnh') {
        alerts.push('Nguy cơ ngập lụt: Lượng mưa tăng mạnh');
      }

      // Tốc độ gió
      if (this.trendData.wind > 10) {
        alerts.push('Nguy cơ gió giật: Tốc độ gió vượt ngưỡng 10 m/s');
      } else if (this.trendData.windTrend === 'Tăng mạnh') {
        alerts.push('Nguy cơ gió giật: Tốc độ gió tăng mạnh');
      }

      // Nhiệt độ
      if (this.trendData.temperature > 35) {
        alerts.push('Nguy cơ sốc nhiệt: Nhiệt độ vượt ngưỡng 35°C');
      } else if (this.trendData.temperatureTrend === 'Giảm mạnh') {
        alerts.push('Nguy cơ thời tiết bất thường: Nhiệt độ giảm mạnh');
      }

      // Độ ẩm
      if (this.trendData.humidity > 90 && this.trendData.humidityTrend === 'Tăng') {
        alerts.push('Nguy cơ cao: Độ ẩm tăng và vượt ngưỡng 90%');
      }

      // Kết hợp
      if (this.trendData.rainfall > 5 && this.trendData.wind > 10) {
        alerts.push('Nguy cơ nghiêm trọng: Mưa lớn kết hợp gió mạnh');
      }
      if (this.trendData.rainfall > 5 && this.trendData.humidity > 90) {
        alerts.push('Nguy cơ nghiêm trọng: Mưa lớn kết hợp độ ẩm cao');
      }

      this.trendData.alert = alerts.join(' | ');
    }
  }
};
</script>

<style scoped>
.early-warning {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}
.data-section {
  margin-bottom: 20px;
}
.data-preview {
  margin-top: 10px;
  font-size: 0.9em;
  color: #2c3e50;
}
button {
  padding: 10px 20px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}
button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}
.prediction-section {
  text-align: center;
}
.trend-result {
  margin-top: 20px;
}
.trend-item {
  margin: 10px 0;
}
.trend-up {
  color: red;
  font-weight: bold;
}
.trend-down {
  color: green;
  font-weight: bold;
}
.trend-stable {
  color: blue;
  font-weight: bold;
}
.alert {
  color: red;
  font-weight: bold;
  margin-top: 10px;
}
.chart-container {
  margin-top: 20px;
}
.error {
  color: red;
  margin-top: 10px;
}
</style>