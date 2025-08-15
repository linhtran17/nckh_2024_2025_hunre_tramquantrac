<template>
  <el-dialog
    title="Thông tin Trạm Quan Trắc"
    v-model="dialogVisible"
    width="400px"
    @close="dongDialog"
    style="border: 1px solid red;"
  >
    <el-form label-position="top" :model="tram" :rules="rules" ref="tramForm">
      <el-form-item label="Tên trạm" prop="name">
        <el-input v-model="tram.name" />
      </el-form-item>
      <el-form-item label="Vị trí">
        <el-input v-model="tram.location" />
      </el-form-item>
      <el-form-item label="Vĩ độ" prop="latitude">
        <el-input v-model.number="tram.latitude" type="number" step="0.0001" placeholder="Nhập vĩ độ (VD: 21.0575)" />
      </el-form-item>
      <el-form-item label="Kinh độ" prop="longitude">
        <el-input v-model.number="tram.longitude" type="number" step="0.0001" placeholder="Nhập kinh độ (VD: 105.7603)" />
      </el-form-item>
      <el-form-item label="Trạng thái" prop="status">
        <el-select v-model="tram.status" placeholder="Chọn trạng thái">
          <el-option label="Đang hoạt động" value="active" />
          <el-option label="Không hoạt động" value="inactive" />
          <el-option label="Lỗi" value="error" />
          <el-option label="Bảo trì" value="maintenance" />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dongDialog">Hủy</el-button>
      <el-button type="primary" @click="luuTram">Lưu</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  modelValue: Object,
  visible: Boolean,
});
const emit = defineEmits(['update:visible', 'save']);

const tram = ref({ id: null, name: '', location: '', status: 'active', latitude: 0.0, longitude: 0.0 });
const tramForm = ref(null);
const dialogVisible = ref(props.visible);

const rules = {
  name: [{ required: true, message: 'Tên trạm là bắt buộc', trigger: 'blur' }],
  status: [{ required: true, message: 'Trạng thái là bắt buộc', trigger: 'change' }],
  latitude: [{ required: true, message: 'Vĩ độ là bắt buộc', trigger: 'blur' }],
  longitude: [{ required: true, message: 'Kinh độ là bắt buộc', trigger: 'blur' }],
};

watch(
  () => props.modelValue,
  (newVal) => {
    tram.value = { ...newVal, status: newVal.status || 'active', latitude: newVal.latitude || 0.0, longitude: newVal.longitude || 0.0 };
    console.log('TramForm nhận modelValue:', tram.value);
  },
  { immediate: true }
);

watch(
  () => props.visible,
  (newVal) => {
    dialogVisible.value = newVal;
    console.log('TramForm nhận visible:', newVal);
    if (!newVal && tramForm.value) {
      tramForm.value.resetFields();
    }
  },
  { immediate: true }
);

watch(dialogVisible, (newVal) => {
  console.log('dialogVisible thay đổi thành:', newVal);
  emit('update:visible', newVal);
});

const dongDialog = () => {
  dialogVisible.value = false;
  emit('update:visible', false);
  console.log('Đóng dialog, emit update:visible:', false);
};

const luuTram = () => {
  tramForm.value.validate((valid) => {
    if (valid) {
      console.log('Dữ liệu gửi từ TramForm:', tram.value);
      emit('save', tram.value);
      dongDialog();
    } else {
      console.log('Validation failed');
    }
  });
};
</script>