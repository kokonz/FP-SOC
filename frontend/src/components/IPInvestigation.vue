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
      </div>      <!-- Threat Analysis -->
      <div class="card threat-analysis-card">
        <h3>Threat Analysis</h3>
        <div class="threat-summary">
          <div class="threat-severity" :class="getThreatSeverityClass(currentIP?.aiAnalysis?.riskLevel)">
            <h4>Threat Severity</h4>
            <div class="severity-score" :class="{ 'pulse': currentIP?.aiAnalysis?.riskScore >= 80 }">
              {{ currentIP?.aiAnalysis?.riskScore || 0 }}
              <span class="severity-label">/ 100</span>
            </div>
            <div class="severity-level">{{ currentIP?.aiAnalysis?.riskLevel || 'LOW' }}</div>
          </div>
          <div class="threat-types">
            <h4>Threat Classification</h4>
            <div class="threat-tags">
              <span 
                v-for="(type, index) in (currentIP?.aiAnalysis?.threatTypes || ['None Detected'])" 
                :key="index" 
                class="threat-tag"
                :class="getThreatTypeClass(type)"
                :title="getThreatTypeDescription(type)"
              >
                {{ type }}
              </span>
            </div>
          </div>
        </div>

        <div class="threat-details">
          <div class="threat-timeline">
            <h4>Analysis Timeline</h4>
            <div class="timeline-item">
              <span class="timeline-label">First Detection:</span>
              <span class="timeline-value">{{ currentIP?.firstSeen ? formatDate(currentIP.firstSeen) : 'Not detected' }}</span>
            </div>
            <div class="timeline-item">
              <span class="timeline-label">Last Analyzed:</span>
              <span class="timeline-value">{{ currentIP?.aiAnalysis?.lastAnalyzed ? formatDate(currentIP.aiAnalysis.lastAnalyzed) : 'Not analyzed yet' }}</span>
            </div>
            <div class="timeline-item">
              <span class="timeline-label">Detection Count:</span>
              <span class="timeline-value">{{ currentIP?.reputation?.virusTotal?.detections?.length || 0 }} sources</span>
            </div>
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

const getThreatSeverityClass = (level: string | undefined) => {
  if (!level) return 'severity-low';
  
  switch (level.toUpperCase()) {
    case 'CRITICAL': return 'severity-critical';
    case 'HIGH': return 'severity-high';
    case 'MEDIUM': return 'severity-medium';
    default: return 'severity-low';
  }
};

const getThreatTypeDescription = (type: string): string => {
  const descriptions: Record<string, string> = {
    'Malicious Activity': 'Known malicious behavior or attacks detected',
    'Community Reported Threats': 'Reports from security community members',
    'Security Vendor Detections': 'Detections from antivirus and security vendors',
    'Reported Abuse': 'Reported network abuse or malicious activities',
    'None Detected': 'No threats detected at this time'
  };
  return descriptions[type] || 'Unknown threat type';
};

const getThreatTypeClass = (type: string): string => {
  const typeMap: Record<string, string> = {
    'Malicious Activity': 'type-malicious',
    'Community Reported Threats': 'type-community',
    'Security Vendor Detections': 'type-security',
    'Reported Abuse': 'type-abuse',
    'None Detected': 'type-none'
  };
  return typeMap[type] || 'type-default';
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

.threat-analysis-card {
  grid-column: 1 / -1;
}

.threat-summary {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.threat-severity {
  text-align: center;
  padding: 1.5rem;
  border-radius: 0.5rem;
  background: var(--background-color);
}

.severity-score {
  font-size: 2.5rem;
  font-weight: 700;
  margin: 1rem 0;
}

.severity-label {
  font-size: 1rem;
  opacity: 0.7;
}

.severity-level {
  font-size: 1.25rem;
  font-weight: 600;
  margin-top: 0.5rem;
}

.threat-types {
  padding: 1.5rem;
  border-radius: 0.5rem;
  background: var(--background-color);
}

.threat-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1rem;
}

.threat-tag {
  padding: 0.5rem 1rem;
  border-radius: 1rem;
  font-size: 0.875rem;
  font-weight: 500;
}

.threat-details {
  margin-top: 1.5rem;
}

.threat-timeline {
  padding: 1rem;
  background: var(--background-color);
  border-radius: 0.5rem;
}

.timeline-item {
  display: flex;
  justify-content: space-between;
  margin-top: 0.5rem;
}

/* Severity Classes */
.severity-critical {
  background: rgba(220, 38, 38, 0.1);
  color: #dc2626;
}

.severity-high {
  background: rgba(234, 88, 12, 0.1);
  color: #ea580c;
}

.severity-medium {
  background: rgba(234, 179, 8, 0.1);
  color: #ea580c;
}

.severity-low {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

/* Threat Type Classes */
.type-malicious {
  background: rgba(220, 38, 38, 0.1);
  color: #dc2626;
}

.type-community {
  background: rgba(234, 88, 12, 0.1);
  color: #ea580c;
}

.type-security {
  background: rgba(234, 179, 8, 0.1);
  color: #eab308;
}

.type-abuse {
  background: rgba(147, 51, 234, 0.1);
  color: #9333ea;
}

.type-none {
  background: rgba(107, 114, 128, 0.1);
  color: #6b7280;
}

.type-default {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
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
