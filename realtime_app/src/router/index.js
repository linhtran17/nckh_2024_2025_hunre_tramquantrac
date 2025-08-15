import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import QuanLyTram from '../views/QuanLyTram.vue';
import Weather from '../components/WeatherData.vue';
import Forecast from '../components/Forecast.vue';
import StationMap from '../views/StationMap.vue';
import QuanLyThongSo from '../views/QuanLyThongSo.vue';
import QuanLyData from '../views/QuanLyData.vue';
import TheoDoiTram from '../views/TheoDoiTram.vue';
import EarlyWarning from '../components/EarlyWarning.vue';




const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'TheoDoiTram',
      component: TheoDoiTram,
    },
    { 
      path: '/quan-ly-tram', 
      name: 'QuanLyTram', 
      component: QuanLyTram,
      
    },
    { 
      path: '/quan-ly-nguong', 
      name: 'ThresholdManagement', 
      component: () => import('@/views/ThresholdManagement.vue')
    },
    {
      path: '/du-bao-thoi-tiet',
      name: 'WeatherRealtime',
      component: () => import('@/components/WeatherRealtime.vue')
    },
    {
      path: '/quan-ly-thong-so',
      name: 'QuanLyThongSo',
      component: QuanLyThongSo,

    },

    {
      path: '/quan-ly-data',
      name: 'QuanLyData',
      component: QuanLyData,

    },
    
    


    {
      path: '/about',
      name: 'about',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/AboutView.vue'),
    },{
      path: '/map',
      name: 'StationMap',
      component: StationMap,
    },
    ,{
      path: '/chart',
      name: 'EarlyWarning',
      component: EarlyWarning,
    },
    
  ],
})

export default router
