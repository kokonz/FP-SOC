<!-- frontend/src/components/MonitoredIPs.vue -->
<template>
  <div class="monitored-ips">
    <h2>Monitored IPs</h2>
    
    <div class="ip-grid">
      <div v-for="ip in monitoredIPs" :key="ip._id" class="ip-card" @click="viewDetails(ip)">
        <div class="ip-header">
          <h3>{{ ip.address }}</h3>
          <span :class="['status-badge', riskLevelClass(ip.aiAnalysis.riskScore)]">
            {{ getRiskLevel(ip.aiAnalysis.riskScore) }}
          </span>
        </div>

        <div class="ip-details">
          <div class="detail-item">
            <span class="label">Location:</span>
            <span>{{ ip.geoLocation.city }}, {{ ip.geoLocation.country }}</span>
          </div>
          <div class="detail-item">
            <span class="label">Risk Score:</span>
            <span class="score-value">{{ ip.aiAnalysis.riskScore }}</span>
          </div>
        </div>

        <div class="ai-summary">
          <p class="label">AI Summary:</p>
          <p class="summary-text">{{ ip.aiAnalysis.summary }}</p>
        </div>

        <div class="actions">
          <button @click.stop="stopMonitoring(ip.address)" class="stop-btn">
            Stop Monitoring
          </button>
        </div>
      </div>
    </div>

    <div v-if="monitoredIPs.length === 0 && !ipStore.loading" class="no-data">
      No IPs currently being monitored. Start by investigating an IP.
    </div>
    <div v-if="ipStore.loading" class="loading">
      <div class="spinner"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import { useIPStore } from '../stores/ipStore';
// Hapus baris ini karena tidak digunakan: import { formatDate } from '../utils/dateFormatter';

const ipStore = useIPStore();
const router = useRouter();
const { monitoredIPs } = storeToRefs(ipStore);

const getRiskLevel = (score: number) => {
  if (score >= 80) return 'Critical';
  if (score >= 60) return 'High';
  if (score >= 40) return 'Medium';
  return 'Low';
};

const riskLevelClass = (score: number) => {
  if (score >= 80) return 'risk-critical';
  if (score >= 60) return 'risk-high';
  if (score >= 40) return 'risk-medium';
  return 'risk-low';
};

const viewDetails = (ip: any) => {
  router.push({ name: 'IPDetails', params: { address: ip.address } });
};

const stopMonitoring = async (address: string) => {
  try {
    await ipStore.stopMonitoring(address);
  } catch (error) {
    console.error('Failed to stop monitoring:', error);
  }
};

onMounted(async () => {
  try {
    await ipStore.loadMonitoredIPs();
  } catch (error) {
    console.error('Failed to load monitored IPs:', error);
  }
});
</script>

<style scoped>
.monitored-ips { padding: 1rem; }
.ip-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem; margin-top: 1rem; }
.ip-card { background: var(--surface-color); border-radius: 8px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05); cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; }
.ip-card:hover { transform: translateY(-4px); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); }
.ip-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.status-badge { padding: 0.25rem 0.75rem; border-radius: 1rem; color: white; font-weight: 500; font-size: 0.8rem; }
.risk-critical { background: var(--error-color); }
.risk-high { background: var(--warning-color); }
.risk-medium { background: var(--info-color); }
.risk-low { background: var(--success-color); }
.ip-details { display: flex; justify-content: space-between; margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-color); }
.detail-item { text-align: center; }
.label { color: var(--text-muted); font-size: 0.8rem; }
.score-value { font-weight: 600; font-size: 1.2rem; }
.ai-summary .label { font-weight: 500; }
.summary-text { margin-top: 0.5rem; font-size: 0.9rem; color: var(--text-secondary); line-height: 1.4; height: 4.2em; overflow: hidden; text-overflow: ellipsis; }
.actions { margin-top: 1rem; }
.stop-btn { width: 100%; background: var(--error-color); color: white; padding: 0.5rem; border: none; border-radius: 4px; cursor: pointer; }
.no-data { text-align: center; color: var(--text-muted); margin-top: 2rem; }
</style>