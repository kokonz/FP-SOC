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
          <h3>Overview</h3>
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

      <!-- Reputation Analysis -->
      <div class="card reputation-card">
        <h3>Reputation Analysis</h3>
        <div class="reputation-grid">
          <div class="reputation-item">
            <h4>VirusTotal</h4>
            <div class="score-display" :class="getScoreClass(currentIP.reputation.virusTotal.score)">
              {{ currentIP.reputation.virusTotal.score }}
            </div>
            <div class="details">
              <p>Detections: {{ currentIP.reputation.virusTotal.detections.length }}</p>
              <p>Last Update: {{ formatDate(currentIP.reputation.virusTotal.lastUpdate) }}</p>
            </div>
          </div>
          
          <div class="reputation-item">
            <h4>AbuseIPDB</h4>
            <div class="score-display" :class="getScoreClass(currentIP.reputation.abuseIPDB.score)">
              {{ currentIP.reputation.abuseIPDB.score }}
            </div>
            <div class="details">
              <p>Reports: {{ currentIP.reputation.abuseIPDB.reports }}</p>
            </div>
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

      <!-- Services and Ports -->
      <div class="card services-card">
        <h3>Exposed Services</h3>
        <div class="services-list">
          <div v-for="(port, index) in currentIP.services.ports" :key="index" class="service-item">
            <span class="port">Port {{ port }}</span>
            <span class="protocol">{{ currentIP.services.protocols[index] || 'Unknown' }}</span>
            <span class="banner">{{ currentIP.services.banners[index] || 'No banner' }}</span>
          </div>
        </div>
      </div>

      <!-- AI Analysis -->
      <div class="card ai-analysis-card">
        <h3>AI Analysis</h3>
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

// Watch for prop changes and auto-investigate
watch(() => props.address, (newAddress) => {
  if (newAddress) {
    ipAddress.value = newAddress;
    investigate();
  }
});

// Auto-investigate when mounted with an address
onMounted(() => {
  if (props.address || route.params.address) {
    ipAddress.value = (props.address || route.params.address) as string;
    investigate();
  }
});

const riskLevel = computed(() => {
  if (!currentIP.value) return '';
  const score = currentIP.value.aiAnalysis.riskScore;
  if (score >= 80) return 'Critical';
  if (score >= 60) return 'High';
  if (score >= 40) return 'Medium';
  return 'Low';
});

const riskLevelClass = computed(() => {
  if (!currentIP.value) return '';
  const score = currentIP.value.aiAnalysis.riskScore;
  if (score >= 80) return 'risk-critical';
  if (score >= 60) return 'risk-high';
  if (score >= 40) return 'risk-medium';
  return 'risk-low';
});

const getScoreClass = (score: number) => {
  if (score >= 80) return 'score-critical';
  if (score >= 60) return 'score-high';
  if (score >= 40) return 'score-medium';
  return 'score-low';
};

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
.ip-investigation {
  max-width: 1200px;
  margin: 0 auto;
}

.search-section {
  margin-bottom: 2rem;
}

.search-form {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

.search-form input {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 0.375rem;
  font-size: 1rem;
}

.results-section {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
}

.overview-card {
  grid-column: 1 / -1;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.quick-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  background: var(--background-color);
  border-radius: 0.375rem;
}

.stat-label {
  font-size: 0.875rem;
  color: var(--text-muted);
}

.stat-value {
  font-size: 1.125rem;
  font-weight: 500;
  margin-top: 0.5rem;
}

.reputation-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
}

.reputation-item {
  text-align: center;
  padding: 1rem;
  background: var(--background-color);
  border-radius: 0.375rem;
}

.score-display {
  font-size: 2rem;
  font-weight: 600;
  margin: 1rem 0;
  padding: 0.5rem;
  border-radius: 0.375rem;
}

.details {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.geo-details,
.services-list {
  display: grid;
  gap: 0.75rem;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem;
  background: var(--background-color);
  border-radius: 0.375rem;
}

.service-item {
  display: grid;
  grid-template-columns: auto 1fr 2fr;
  gap: 1rem;
  padding: 0.5rem;
  background: var(--background-color);
  border-radius: 0.375rem;
}

.ai-analysis-card {
  grid-column: 1 / -1;
}

.findings-section,
.recommendations-section {
  margin-top: 1rem;
}

.findings-list,
.recommendations-list {
  list-style-type: none;
  padding: 0;
  margin: 0.5rem 0;
}

.findings-list li,
.recommendations-list li {
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  background: var(--background-color);
  border-radius: 0.375rem;
}

.actions-card {
  grid-column: 1 / -1;
  display: flex;
  justify-content: center;
  gap: 1rem;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--background-color);
  border-top: 4px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
