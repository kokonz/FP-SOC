<template>
  <div class="investigation-form">
    <div class="form-container">
      <h2>IP Investigation</h2>
      <div class="input-group">
        <input 
          v-model="ipAddress" 
          type="text" 
          placeholder="Enter IP address"
          @keyup.enter="investigate"
        />
        <button 
          @click="investigate" 
          :disabled="loading || !ipAddress"
        >
          {{ loading ? 'Investigating...' : 'Investigate' }}
        </button>
      </div>
      <div v-if="error" class="error-message">
        {{ error }}
      </div>
    </div>

    <div v-if="currentIP" class="results-container">
      <div class="result-section risk-score">
        <h3>Risk Score</h3>
        <div class="score" :class="riskLevelClass">
          {{ currentIP.aiAnalysis.riskScore }}
        </div>
      </div>

      <div class="result-section reputation">
        <h3>Reputation</h3>
        <div class="reputation-scores">
          <div class="score-item">
            <span>VirusTotal:</span>
            <span>{{ currentIP.reputation.virusTotal.score }}</span>
          </div>
          <div class="score-item">
            <span>AbuseIPDB:</span>
            <span>{{ currentIP.reputation.abuseIPDB.score }}</span>
          </div>
        </div>
      </div>

      <div class="result-section location">
        <h3>Location</h3>
        <div class="location-info">
          <p>{{ currentIP.geoLocation.city }}, {{ currentIP.geoLocation.country }}</p>
          <p>ISP: {{ currentIP.geoLocation.isp }}</p>
          <p>ASN: {{ currentIP.geoLocation.asn }}</p>
        </div>
      </div>

      <div class="result-section findings">
        <h3>Key Findings</h3>
        <ul>
          <li v-for="(finding, index) in currentIP.aiAnalysis.findings" 
              :key="index">
            {{ finding }}
          </li>
        </ul>
      </div>

      <div class="result-section recommendations">
        <h3>Recommendations</h3>
        <ul>
          <li v-for="(rec, index) in currentIP.aiAnalysis.recommendations" 
              :key="index">
            {{ rec }}
          </li>
        </ul>
      </div>

      <div class="actions">
        <button 
          @click="startMonitoring" 
          v-if="!isMonitored"
          class="monitor-btn"
        >
          Start Monitoring
        </button>
        <button 
          @click="stopMonitoring" 
          v-else
          class="monitor-btn stop"
        >
          Stop Monitoring
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useIPStore } from '../stores/ipStore';

const ipStore = useIPStore();
const ipAddress = ref('');
const error = ref('');
const loading = ref(false);

const currentIP = computed(() => ipStore.currentIP);
const isMonitored = computed(() => 
  ipStore.monitoredIPs.some(ip => ip.address === ipAddress.value)
);

const riskLevelClass = computed(() => {
  if (!currentIP.value) return '';
  const score = currentIP.value.aiAnalysis.riskScore;
  if (score >= 75) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 25) return 'medium';
  return 'low';
});

async function investigate() {
  if (!ipAddress.value) return;
  
  loading.value = true;
  error.value = '';
  
  try {
    await ipStore.investigateIP(ipAddress.value);
  } catch (err: any) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

async function startMonitoring() {
  try {
    await ipStore.startMonitoring(ipAddress.value);
  } catch (err: any) {
    error.value = err.message;
  }
}

async function stopMonitoring() {
  try {
    await ipStore.stopMonitoring(ipAddress.value);
  } catch (err: any) {
    error.value = err.message;
  }
}
</script>

<style scoped>
.investigation-form {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.form-container {
  margin-bottom: 2rem;
}

.input-group {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

input {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

button {
  padding: 0.75rem 1.5rem;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
}

button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.error-message {
  color: #f44336;
  margin-top: 1rem;
}

.results-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-top: 2rem;
}

.result-section {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.score {
  font-size: 3rem;
  font-weight: bold;
  text-align: center;
  padding: 1rem;
  border-radius: 4px;
}

.score.low { color: #4CAF50; }
.score.medium { color: #FF9800; }
.score.high { color: #f44336; }
.score.critical { color: #B71C1C; }

.reputation-scores {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.score-item {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem;
  background: #f5f5f5;
  border-radius: 4px;
}

.location-info p {
  margin: 0.5rem 0;
}

ul {
  list-style-type: none;
  padding: 0;
}

li {
  padding: 0.5rem 0;
  border-bottom: 1px solid #eee;
}

.actions {
  grid-column: 1 / -1;
  display: flex;
  justify-content: center;
  margin-top: 2rem;
}

.monitor-btn {
  padding: 1rem 2rem;
  font-size: 1.1rem;
}

.monitor-btn.stop {
  background-color: #f44336;
}
</style>
