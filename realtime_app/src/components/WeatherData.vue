<template>
  <el-table
    :data="tableData"
    style="width: 100%; max-width: 1200px; margin: 0 auto;"
    :row-class-name="tableRowClassName"
  >
    <el-table-column prop="NhietDo" label="Nhiệt Độ (°C)" width="200" />
    <el-table-column prop="DoAm" label="Độ Ẩm (%)" width="200" />
    <el-table-column prop="LuongMua" label="Lượng Mưa (mm)" width="200" />
    <el-table-column prop="SucGio" label="Sức Gió (km/h)" width="200" />
  </el-table>
</template>

<script lang="ts" setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import socket from '../socket'
import axios from 'axios'

interface WeatherData {
  NhietDo: number
  DoAm: number
  LuongMua: number
  SucGio: number
}

const tableData = ref<WeatherData[]>([])

// Lấy dữ liệu ban đầu từ API
const fetchInitialData = async () => {
  try {
    const response = await axios.get('http://localhost:3005/api/data/all')
    tableData.value = response.data.map((item: any) => ({
      NhietDo: item.temperature,
      DoAm: item.humidity,
      LuongMua: item.rain,
      SucGio: item.wind
    }))
  } catch (error) {
    console.error('Lỗi khi lấy dữ liệu ban đầu:', error)
  }
}

const tableRowClassName = ({ row }: { row: WeatherData; rowIndex: number }) => {
  if (row.NhietDo > 35 || row.NhietDo < 15) return row.NhietDo > 38 ? 'danger-row' : 'warning-row'
  if (row.DoAm > 80 || row.DoAm < 30) return row.DoAm > 90 ? 'danger-row' : 'warning-row'
  if (row.LuongMua > 20) return 'danger-row'
  else if (row.LuongMua > 10) return 'warning-row'
  if (row.SucGio > 25) return 'danger-row'
  else if (row.SucGio > 15) return 'warning-row'
  return ''
}

onMounted(() => {
  fetchInitialData() // Lấy dữ liệu ban đầu

  socket.on('newData', (data: WeatherData) => {
    console.log('Nhận dữ liệu từ server:', data)
    tableData.value.unshift(data)
    if (tableData.value.length > 10) {
      tableData.value.pop()
    }
  })
})

onBeforeUnmount(() => {
  socket.off('newData') // Sửa tên sự kiện cho đúng
})
</script>

<style scoped>
.el-table .warning-row {
  --el-table-tr-bg-color: var(--el-color-warning-light-8);
}
.el-table .danger-row {
  --el-table-tr-bg-color: var(--el-color-danger-light-8);
}
</style>