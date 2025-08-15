import { io } from "socket.io-client";

// Kết nối tới server backend của bạn (chỉnh lại URL nếu khác)
const socket = io("http://localhost:3005", {
  transports: ["websocket"],
})

export default socket;
