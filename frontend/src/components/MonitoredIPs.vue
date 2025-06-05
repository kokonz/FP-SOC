<template>
  <div class="monitored-ips">
    <h2>Monitored IPs</h2>
    
    <div class="ip-grid">
      <div v-for="ip in monitoredIPs" :key="ip.address" class="ip-card">
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
            <span class="label">Last Seen:</span>
            <span>{{ formatDate(ip.lastSeen) }}</span>
          </div>

          <div class="detail-item">
            <span class="label">ISP:</span>
            <span>{{ ip.geoLocation.isp }}</span>
          </div>
        </div>

        <div class="reputation-section">
          <div class="reputation-score">
            <span>VirusTotal</span>
            <div class="score" :class="getScoreClass(ip.reputation.virusTotal.score)">
              {{ ip.reputation.virusTotal.score }}
            </div>
          </div>
          
          <div class="reputation-score">
            <span>AbuseIPDB</span>
            <div class="score" :class="getScoreClass(ip.reputation.abuseIPDB.score)">
              {{ ip.reputation.abuseIPDB.score }}
            </div>
          </div>
        </div>

        <div class="actions">
          <button @click="viewDetails(ip)" class="detail-btn">View Details</button>
          <button @click="stopMonitoring(ip.address)" class="stop-btn">
            Stop Monitoring
          </button>
        </div>
      </div>
    </div>

    <div v-if="monitoredIPs.length === 0" class="no-data">
      No IPs currently being monitored
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import { useIPStore } from '../stores/ipStore';
import { formatDate } from '../utils/dateFormatter';

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

const getScoreClass = (score: number) => {
  if (score >= 80) return 'score-critical';
  if (score >= 60) return 'score-high';
  if (score >= 40) return 'score-medium';
  return 'score-low';
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
.monitored-ips {
  padding: 1rem;
}

.ip-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.ip-card {
  background: var(--surface-color);
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.ip-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.status-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
}

.risk-critical { background: var(--error-color); color: white; }
.risk-high { background: var(--warning-color); color: white; }
.risk-medium { background: var(--info-color); color: white; }
.risk-low { background: var(--success-color); color: white; }

.ip-details {
  margin-bottom: 1rem;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.label {
  color: var(--text-muted);
  font-weight: 500;
}

.reputation-section {
  display: flex;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.reputation-score {
  text-align: center;
}

.score {
  font-size: 1.25rem;
  font-weight: 600;
  padding: 0.5rem;
  border-radius: 4px;
  margin-top: 0.25rem;
}

.score-critical { color: var(--error-color); }
.score-high { color: var(--warning-color); }
.score-medium { color: var(--info-color); }
.score-low { color: var(--success-color); }

.actions {
  display: flex;
  gap: 0.5rem;
}

.detail-btn,
.stop-btn {
  flex: 1;
  padding: 0.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

.detail-btn {
  background: var(--primary-color);
  color: white;
}

.stop-btn {
  background: var(--error-color);
  color: white;
}

.no-data {
  text-align: center;
  color: var(--text-muted);
  margin-top: 2rem;
}
</style>
