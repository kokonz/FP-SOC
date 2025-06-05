import { createRouter, createWebHistory } from 'vue-router';
import IPInvestigation from '../components/IPInvestigation.vue';
import MonitoredIPs from '../components/MonitoredIPs.vue';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: IPInvestigation
  },
  {
    path: '/monitored',
    name: 'MonitoredIPs',
    component: MonitoredIPs
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
