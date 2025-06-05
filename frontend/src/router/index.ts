import { createRouter, createWebHistory } from 'vue-router';
import IPInvestigation from '../components/IPInvestigation.vue';
import MonitoredIPs from '../components/MonitoredIPs.vue';
import Dashboard from '../components/Dashboard.vue';

const routes = [
  {
    path: '/',
    name: 'investigate',
    component: IPInvestigation
  },
  {
    path: '/monitored',
    name: 'monitored',
    component: MonitoredIPs
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: Dashboard
  },
  {
    path: '/ip/:address',
    name: 'IPDetails',
    component: IPInvestigation,
    props: true
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
