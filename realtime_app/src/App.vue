<template>
  <el-container>
    <!-- Header -->
          <!-- <img src="@/assets/logohunre.png" alt="Logo" class="logo" width="70px" height="90px" /> -->
    <el-header class="header">
      <span class="title" style="margin-left: 20px;" >HUNRE Student Weather Alert System</span>
    </el-header>

    <el-container>
      <!-- Sidebar Navigation -->
      <el-aside width="200px" class="sidebar">
        <el-menu :default-active="activeMenu" class="el-menu-vertical">
          
          <el-menu-item index="1" @click="navigateTo('/')">
            <el-icon><Monitor /></el-icon>
            <span>Theo dõi Trạm</span>
          </el-menu-item>
          <el-menu-item index="2" @click="navigateTo('/quan-ly-tram')">
            <el-icon><Management /></el-icon>
            <span>Quản lý Trạm</span>
          </el-menu-item>
          <el-menu-item index="3" @click="navigateTo('/quan-ly-nguong')">
            <el-icon><SetUp /></el-icon>
            <span>Quản lý ngưỡng</span>
          </el-menu-item>
          <el-menu-item index="4" @click="navigateTo('/map')">
            <el-icon><Location /></el-icon>
            <span>Bản đồ</span>
          </el-menu-item>
          <el-menu-item index="5" @click="navigateTo('/quan-ly-data')">
            <el-icon><DataAnalysis /></el-icon>
            <span>Thống kê Dữ Liệu</span>
          </el-menu-item>
          <el-menu-item index="6" @click="navigateTo('/chart')">
            <el-icon><DataAnalysis /></el-icon>
            <span>Dự đoán AI</span>
          </el-menu-item>
          
        </el-menu>
      </el-aside>

      <!-- Main Content -->
      <el-main class="content">
        <router-view :key="$route.fullPath"></router-view>
      </el-main>
    </el-container>
  </el-container>
</template>
<script setup>
import { ref, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { House, Monitor, Management, SetUp, Location, DataAnalysis, Switch } from "@element-plus/icons-vue";

const router = useRouter();
const route = useRoute();
const activeMenu = ref("1");

// Đồng bộ activeMenu với route hiện tại
watch(
  () => route.path,
  (newPath) => {
    const menuMap = {
      "/": "1",
      "/quan-ly-tram": "2",
      "/quan-ly-nguong": "3",
      "/map": "4",
      "/quan-ly-data": "5",
      "/chart": "6",
    };
    activeMenu.value = menuMap[newPath] || "1";
  },
  { immediate: true }
);

// Phương thức điều hướng
const navigateTo = (path) => {
  console.log(`Navigating to: ${path}`);
  router.push(path).catch((err) => {
    console.error("Navigation error:", err);
  });
};

// Phương thức thoát
const logout = () => {
  console.log("Logging out...");
  router.push("/login"); // Giả định có route /login
};
</script>
<style scoped>
/* Header */
.header {
  display: flex;
  align-items: center;
  font-family: "Poppins", "Inter", "Segoe UI", "Roboto", sans-serif !important;
  background-color: #dff5d0;
  color: #023b02;
  font-size: 28px;
  height: 80px;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 1000;
  padding: 10px;
  font-weight: 600;

}

/* Logo */
.logo {
  height: 50px;
  margin: 0 20px;
}

/* Sidebar */
.sidebar {
  background-color: #4caf50;
  width: 200px; /* Đảm bảo chiều rộng cố định */
  position: fixed;
  top: 80px; /* Khoảng cách từ header */
  left: 0;
  bottom: 0; /* Kéo dài đến cuối viewport */
  margin: 0; /* Loại bỏ margin thừa */
  padding: 0; /* Loại bỏ padding thừa */
}

/* Menu */
.el-menu-vertical {
  font-weight: 500;
  font-family: "Poppins", "Inter", "Segoe UI", "Roboto", sans-serif !important;
  background-color: #2e7d32;
  color: #ffffff;
  height: 100%; /* Đảm bảo menu chiếm toàn bộ chiều cao của sidebar */
  border-right: none; /* Loại bỏ đường viền bên phải nếu có */
}

.el-menu-item:hover {
  font-family: "Poppins", "Inter", "Segoe UI", "Roboto", sans-serif !important;
  font-size: 18px;
  background-color: #1b5e20 !important;
}

.el-menu-item {
  font-weight: 550 !important;
  color: #ffffff;
  font-size: 16px;
}

/* Main Content */
.content {
  margin-left: 200px; /* Khoảng cách để tránh sidebar */
  margin-top: 70px; /* Khoảng cách để tránh header */
  padding: 15px;
  background: #fff;
  min-height: calc(100vh - 70px);
}
</style>