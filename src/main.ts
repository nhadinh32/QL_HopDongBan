/// <reference types="vite/client" />

import { mount } from 'svelte';
import App from './App.svelte';
import './app.css';

// Gắn component gốc vào phần tử #app được khai báo trong index.html.
const target = document.getElementById('app');

if (!target) throw new Error('Application root was not found.');

// mount trả về instance; ứng dụng hiện không cần giữ tham chiếu để hủy thủ công.
mount(App, { target });
