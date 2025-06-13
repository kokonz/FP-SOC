<!-- frontend/src/components/IPInvestigation.vue -->
<template>
  <div class="ip-investigation">
    <div class="search-section card">
      <h2>IP Investigation</h2>
      <div class="search-form">
        <input 
          v-model="ipAddress" 
          type="text"
          placeholder="Enter IP address to investigate"
          @keyup.enter="investigate"
        />
        <button 
          class="btn btn-primary"
          @click="investigate"
          :disabled="!ipAddress || loading"
        >
          <span v-if="loading">Investigating...</span>
          <span v-else>Investigate</span>
        </button>
      </div>
    </div>

    <div v-if="error" class="error">
      {{ error }}
    </div>

    <div v-if="currentIP" class="results-section">
      <!-- Overview Card -->
      <div class="card overview-card">
        <div class="card-header">
          <h3>Overview for {{ currentIP.address }}</h3>
          <div class="risk-indicator">
            <span class="label">Risk Level:</span>
            <span :class="['risk-badge', riskLevelClass]">
              {{ riskLevel }}
            </span>
          </div>
        </div>
        
        <div class="quick-stats">
          <div class="stat-item">
            <span class="stat-label">First Seen</span>
            <span class="stat-value">{{ formatDate(currentIP.firstSeen) }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Last Activity</span>
            <span class="stat-value">{{ formatDate(currentIP.lastSeen) }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Status</span>
            <span class="stat-value">{{ currentIP.status }}</span>
          </div>
        </div>
      </div>

      <!-- Geolocation Information -->
      <div class="card geo-card">
        <h3>Geolocation Information</h3>
        <div class="geo-details">
          <div class="detail-row">
            <span class="label">Country:</span>
            <span>{{ currentIP.geoLocation.country }}</span>
          </div>
          <div class="detail-row">
            <span class="label">City:</span>
            <span>{{ currentIP.geoLocation.city }}</span>
          </div>
          <div class="detail-row">
            <span class="label">ISP:</span>
            <span>{{ currentIP.geoLocation.isp }}</span>
          </div>
          <div class="detail-row">
            <span class="label">ASN:</span>
            <span>{{ currentIP.geoLocation.asn }}</span>
          </div>
        </div>
      </div>

      <!-- Threat Analysis -->
      <div class="card threat-analysis-card">
        <h3>Threat Analysis Summary</h3>
        <div class="threat-summary">
          <div class="threat-severity" :class="riskLevelClass">
            <h4>Risk Score</h4>
            <div class="severity-score">
              {{ currentIP.aiAnalysis.riskScore }}
              <span class="severity-label">/ 100</span>
            </div>
            <div class="severity-level">{{ riskLevel }}</div>
          </div>
          <div class="threat-ai-summary">
            <h4>AI Summary</h4>
            <p>{{ currentIP.aiAnalysis.summary }}</p>
          </div>
        </div>
      </div>
      
      <!-- Bagian Paling Penting: Menampilkan Aktivitas yang Terdeteksi -->
      <div class="card detected-activities-card">
        <h3>Detected Activities (Evidence Log)</h3>
        <div v-if="currentIP.detectedActivities && currentIP.detectedActivities.length > 0" class="activity-table-container">
          <table class="activity-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Type</th>
                <th>Source IP</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(activity, index) in currentIP.detectedActivities" :key="index">
                <td>{{ formatDate(activity.timestamp) }}</td>
                <td><span class="activity-type-badge">{{ activity.type }}</span></td>
                <td>{{ activity.sourceIP }}</td>
                <td class="details-cell">{{ activity.details }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="no-data">
          <p>No suspicious activities have been logged for this IP address.</p>
        </div>
      </div>

      <!-- AI Analysis Details -->
      <div class="card ai-analysis-card">
        <h3>AI Analysis Details</h3>
        <div class="findings-section">
          <h4>Key Findings</h4>
          <ul class="findings-list">
            <li v-for="(finding, index) in currentIP.aiAnalysis.findings" :key="index">
              {{ finding }}
            </li>
          </ul>
        </div>
        
        <div class="recommendations-section">
          <h4>Recommendations</h4>
          <ul class="recommendations-list">
            <li v-for="(rec, index) in currentIP.aiAnalysis.recommendations" :key="index">
              {{ rec }}
            </li>
          </ul>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="actions-card card">
        <button 
          v-if="!isMonitored" 
          class="btn btn-primary"
          @click="startMonitoring"
        >
          Start Monitoring
        </button>
        <button 
          v-else 
          class="btn btn-error"
          @click="stopMonitoring"
        >
          Stop Monitoring
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useIPStore } from '../stores/ipStore';
import { formatDate } from '../utils/dateFormatter';
import { useRoute } from 'vue-router';

const props = defineProps<{
  address?: string
}>();

const route = useRoute();
const ipStore = useIPStore();
const ipAddress = ref(props.address || '');
const error = ref('');
const loading = ref(false);

const currentIP = computed(() => ipStore.currentIP);
const isMonitored = computed(() => currentIP.value?.monitoring?.enabled || false);

watch(() => props.address, (newAddress) => {
  if (newAddress) {
    ipAddress.value = newAddress;
    investigate();
  }
});

onMounted(() => {
  if (props.address || route.params.address) {
    ipAddress.value = (props.address || route.params.address) as string;
    investigate();
  }
});

const riskLevel = computed(() => {
  if (!currentIP.value) return 'N/A';
  const score = currentIP.value.aiAnalysis.riskScore;
  if (score >= 80) return 'Critical';
  if (score >= 60) return 'High';
  if (score >= 40) return 'Medium';
  return 'Low';
});

const riskLevelClass = computed(() => {
  if (!currentIP.value) return 'risk-low';
  const score = currentIP.value.aiAnalysis.riskScore;
  if (score >= 80) return 'risk-critical';
  if (score >= 60) return 'risk-high';
  if (score >= 40) return 'risk-medium';
  return 'risk-low';
});

const investigate = async () => {
  if (!ipAddress.value) return;
  loading.value = true;
  error.value = '';
  try {
    await ipStore.investigateIP(ipAddress.value);
  } catch (err: any) {
    error.value = err.message || 'Failed to investigate IP';
  } finally {
    loading.value = false;
  }
};

const startMonitoring = async () => {
  if (!currentIP.value) return;
  try {
    await ipStore.startMonitoring(currentIP.value.address);
  } catch (err: any) {
    error.value = err.message || 'Failed to start monitoring';
  }
};

const stopMonitoring = async () => {
  if (!currentIP.value) return;
  try {
    await ipStore.stopMonitoring(currentIP.value.address);
  } catch (err: any) {
    error.value = err.message || 'Failed to stop monitoring';
  }
};
</script>

<style scoped>
/* General Styles */
.ip-investigation { max-width: 1200px; margin: 0 auto; }
.search-section, .actions-card { margin-bottom: 2rem; }
.search-form { display: flex; gap: 1rem; margin-top: 1rem; }
.search-form input { flex: 1; }
.results-section { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; }
.overview-card, .threat-analysis-card, .detected-activities-card, .ai-analysis-card, .actions-card { grid-column: 1 / -1; }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.quick-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
.stat-item { display: flex; flex-direction: column; align-items: center; padding: 1rem; background: var(--background-color); border-radius: 0.375rem; }
.stat-label { font-size: 0.875rem; color: var(--text-muted); }
.stat-value { font-size: 1.125rem; font-weight: 500; margin-top: 0.5rem; }
.geo-details { display: grid; gap: 0.75rem; }
.detail-row { display: flex; justify-content: space-between; padding: 0.5rem; background: var(--background-color); border-radius: 0.375rem; }

/* Risk Indicator */
.risk-badge { padding: 0.25rem 0.75rem; border-radius: 1rem; color: white; font-weight: 500; font-size: 0.8rem; }
.risk-critical { background: var(--error-color); }
.risk-high { background: var(--warning-color); }
.risk-medium { background: var(--info-color); }
.risk-low { background: var(--success-color); }

/* Threat Analysis Summary */
.threat-summary { display: grid; grid-template-columns: 1fr 2fr; gap: 1.5rem; }
.threat-severity { text-align: center; padding: 1.5rem; border-radius: 0.5rem; color: white; }
.severity-score { font-size: 2.5rem; font-weight: 700; margin: 1rem 0; }
.severity-label { font-size: 1rem; opacity: 0.7; }
.severity-level { font-size: 1.25rem; font-weight: 600; text-transform: uppercase; }
.threat-ai-summary { padding: 1.5rem; background: var(--background-color); border-radius: 0.5rem; }
.threat-ai-summary p { margin: 0; line-height: 1.6; }

/* Detected Activities Table */
.activity-table-container { max-height: 400px; overflow-y: auto; }
.activity-table { width: 100%; border-collapse: collapse; }
.activity-table th, .activity-table td { padding: 0.75rem; text-align: left; border-bottom: 1px solid var(--border-color); }
.activity-table th { background: var(--background-color); font-weight: 600; }
.details-cell { font-family: 'Courier New', Courier, monospace; font-size: 0.85rem; color: var(--text-secondary); max-width: 400px; word-break: break-all; }
.activity-type-badge { padding: 0.2rem 0.5rem; border-radius: 4px; background: #e2e8f0; color: #475569; font-size: 0.8rem; font-weight: 500; }

/* AI Analysis Details */
.findings-list, .recommendations-list { list-style-type: disc; padding-left: 1.5rem; }
.findings-list li, .recommendations-list li { margin-bottom: 0.75rem; line-height: 1.6; }
.no-data { text-align: center; padding: 2rem; color: var(--text-muted); }

/* Spinner */
.spinner { width: 40px; height: 40px; border: 4px solid var(--background-color); border-top: 4px solid var(--primary-color); border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
</style>