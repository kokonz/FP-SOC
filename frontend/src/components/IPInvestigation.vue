<template>
  <div class="ip-investigation-page">
    <!-- Search Section (Tetap di atas) -->
    <div class="search-section card">
      <h2 class="section-title">IP Address Investigation</h2>
      <div class="search-form">
        <input 
          v-model="ipAddress" 
          type="text"
          class="ip-input"
          placeholder="Enter IP address (e.g., 8.8.8.8)"
          @keyup.enter="investigate"
        />
        <button 
          class="btn btn-primary"
          @click="investigate"
          :disabled="!ipAddress || loading"
        >
          <span v-if="loading">Investigating...</span>
          <span v-else>
            <i class="icon-search"></i> Investigate
          </span>
        </button>
      </div>
      <div v-if="error" class="error-banner">
        {{ error }}
      </div>
    </div>

    <!-- Loading Indicator -->
    <div v-if="loading" class="loading-overlay">
      <div class="spinner"></div>
      <p>Analyzing IP... Please wait.</p>
    </div>

    <!-- Results Section (Layout Dashboard Baru) -->
    <div v-if="currentIP && !loading" class="results-grid">
      
      <!-- [GRID AREA: header] Main Header Card -->
      <div class="card header-card">
        <div class="header-main-info">
          <span class="ip-display">{{ currentIP.address }}</span>
          <div class="risk-indicator">
            <span :class="['risk-badge', riskLevelClass]">
              <i :class="['icon-shield', riskLevelClass]"></i> {{ riskLevel }}
            </span>
          </div>
        </div>
        <div class="header-actions">
           <button 
            v-if="!isMonitored" 
            class="btn btn-primary"
            @click="startMonitoring"
          >
            <i class="icon-monitor"></i> Start Monitoring
          </button>
          <button 
            v-else 
            class="btn btn-error"
            @click="stopMonitoring"
          >
            <i class="icon-stop-monitor"></i> Stop Monitoring
          </button>
        </div>
      </div>
      
      <!-- [GRID AREA: main] Detected Activities - Paling Penting -->
      <div class="card activity-log-card">
        <div class="card-header">
          <h3><i class="icon-log"></i> Detected Activities (Evidence Log)</h3>
          <span class="data-count-badge">{{ currentIP.detectedActivities.length }} entries</span>
        </div>

        <!-- Struktur Daftar Log yang Baru -->
        <div v-if="currentIP.detectedActivities && currentIP.detectedActivities.length > 0" class="activity-list">
          <div v-for="(activity, index) in currentIP.detectedActivities" :key="index" class="activity-entry">
            <div class="entry-header">
              <span class="entry-timestamp">{{ formatDate(activity.timestamp) }}</span>
              <span class="activity-type-badge">{{ activity.type }}</span>
            </div>
            <div class="entry-details">
              <pre>{{ activity.details }}</pre>
            </div>
          </div>
        </div>
        <!-- / Struktur Daftar Log yang Baru -->

        <div v-else class="no-data">
          <i class="icon-check-circle"></i>
          <p>No suspicious activities have been logged for this IP address.</p>
        </div>
      </div>

      <!-- [GRID AREA: sidebar] Analysis Sidebar -->
      <div class="analysis-sidebar">
        <!-- Threat Score Card -->
        <div class="card threat-analysis-card">
          <div class="threat-severity" :class="riskLevelClass">
              <div class="severity-score">
                {{ currentIP.aiAnalysis.riskScore }}<span class="severity-label">/100</span>
              </div>
              <div class="severity-level">AI Risk Score</div>
          </div>
          <div class="threat-ai-summary">
            <h4>AI Summary</h4>
            <p>{{ currentIP.aiAnalysis.summary }}</p>
          </div>
        </div>

        <!-- Geolocation Card -->
        <div class="card">
          <h3><i class="icon-globe"></i> Geolocation</h3>
          <div class="geo-details">
            <span><strong>Country:</strong> {{ currentIP.geoLocation.country }}</span>
            <span><strong>City:</strong> {{ currentIP.geoLocation.city }}</span>
            <span><strong>ISP:</strong> {{ currentIP.geoLocation.isp }}</span>
            <span><strong>ASN:</strong> {{ currentIP.geoLocation.asn }}</span>
          </div>
        </div>

        <!-- AI Details Card -->
        <div class="card">
           <h3><i class="icon-brain"></i> AI Analysis Details</h3>
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
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// SCRIPT ANDA SUDAH SEMPURNA, TIDAK PERLU DIUBAH SAMA SEKALI.
import { ref, computed, onMounted, watch } from 'vue';
import { useIPStore } from '../stores/ipStore';
import { formatDate } from '../utils/dateFormatter';
import { useRoute } from 'vue-router';

const props = defineProps<{ address?: string }>();
const route = useRoute();
const ipStore = useIPStore();
const ipAddress = ref(props.address || '');
const error = ref('');
const loading = ref(false);

const currentIP = computed(() => ipStore.currentIP);
const isMonitored = computed(() => currentIP.value?.monitoring?.enabled || false);

watch(() => props.address, (newAddress) => { if (newAddress) { ipAddress.value = newAddress; investigate(); } });

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
  ipStore.currentIP = null; // Reset current IP data
  try { await ipStore.investigateIP(ipAddress.value); } 
  catch (err: any) { error.value = err.message || 'Failed to investigate IP'; } 
  finally { loading.value = false; }
};

const startMonitoring = async () => { if (!currentIP.value) return; try { await ipStore.startMonitoring(currentIP.value.address); } catch (err: any) { error.value = err.message || 'Failed to start monitoring'; } };
const stopMonitoring = async () => { if (!currentIP.value) return; try { await ipStore.stopMonitoring(currentIP.value.address); } catch (err: any) { error.value = err.message || 'Failed to stop monitoring'; } };
</script>

<style scoped>
/* Tambahkan beberapa ikon sederhana untuk visual (bisa diganti dengan library ikon) */
@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css');
.icon-search::before { content: '\f002'; font-family: 'Font Awesome 6 Free'; font-weight: 900; margin-right: 0.5rem; }
.icon-shield::before { content: '\f3ed'; font-family: 'Font Awesome 6 Free'; font-weight: 900; margin-right: 0.5rem; }
.icon-monitor::before { content: '\f530'; font-family: 'Font Awesome 6 Free'; font-weight: 900; margin-right: 0.5rem; }
.icon-stop-monitor::before { content: '\f05e'; font-family: 'Font Awesome 6 Free'; font-weight: 900; margin-right: 0.5rem; }
.icon-log::before { content: '\f03a'; font-family: 'Font Awesome 6 Free'; font-weight: 900; margin-right: 0.5rem; }
.icon-globe::before { content: '\f0ac'; font-family: 'Font Awesome 6 Free'; font-weight: 900; margin-right: 0.5rem; }
.icon-brain::before { content: '\f5dc'; font-family: 'Font Awesome 6 Free'; font-weight: 900; margin-right: 0.5rem; }
.icon-check-circle::before { content: '\f058'; font-family: 'Font Awesome 6 Free'; font-weight: 900; font-size: 2rem; display: block; margin-bottom: 0.5rem; color: #4ade80; }


/* General & Search Section */
.ip-investigation-page { display: flex; flex-direction: column; gap: 2rem; }
.search-section .section-title { margin: 0 0 1rem; color: var(--text-primary); }
.search-form { display: flex; gap: 1rem; }
.ip-input {
  flex-grow: 1;
  padding: 0.75rem 1rem;
  font-size: 1.1rem;
  border: 2px solid var(--border-color);
  border-radius: 0.5rem;
  transition: border-color 0.3s, box-shadow 0.3s;
  
  /* === TAMBAHKAN BARIS INI === */
  color: var(--text-primary); 
  /* Opsional: pastikan background-nya putih agar kontras terjamin */
  background-color: var(--surface-color, #ffffff);
}
.ip-input:focus { border-color: var(--ucla-blue); box-shadow: 0 0 0 3px rgba(70, 117, 153, 0.25); outline: none; }
.error-banner {
  margin-top: 1rem; padding: 1rem; border-radius: 0.5rem;
  background-color: #fee2e2; color: var(--poppy); border-left: 5px solid var(--poppy);
}

/* New Grid Layout for Results */
.results-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  grid-template-areas:
    "header header"
    "main sidebar";
  gap: 2rem;
  animation: fadeIn 0.5s ease-out;
}
.header-card { grid-area: header; }
.activity-log-card { 
  grid-area: main; 
  display: flex;
  flex-direction: column;

  /* === TAMBAHKAN BARIS INI (INI KUNCINYA) === */
  overflow: hidden; 
}
.analysis-sidebar { grid-area: sidebar; display: flex; flex-direction: column; gap: 1.5rem; }

/* Header Card */
.header-card {
  display: flex; justify-content: space-between; align-items: center;
  padding: 1.5rem 2rem;
}
.header-main-info { display: flex; align-items: center; gap: 1.5rem; }
.ip-display { font-size: 2rem; font-weight: 600; color: var(--delft-blue); font-family: 'Courier New', monospace; }
.risk-badge { padding: 0.5rem 1rem; border-radius: 50px; color: white; font-weight: 600; font-size: 1rem; }

/* Main Content: Activity Log */
.activity-log-card .card-header {
  display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color);
  padding-bottom: 1rem; margin-bottom: 1rem;
}
.activity-log-card .card-header h3 { margin: 0; }
.data-count-badge { background-color: #e2e8f0; color: #475569; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.8rem; font-weight: 500;}
.activity-list {
  /* HAPUS BARIS INI: max-height: 600px; */
  max-height: 600px;
  /* TAMBAHKAN PROPERTI INI */
  flex: 1; /* Shorthand untuk flex-grow: 1, flex-shrink: 1, flex-basis: 0% */
  min-height: 0; /* Trik penting agar overflow bekerja dengan benar di flexbox */
  
  /* PROPERTI INI TETAP ADA */
  overflow-y: auto;
  padding-right: 0.5rem; 
}


.activity-entry {
  background-color: #f8fafc;
  border: 1px solid var(--border-color);
  border-radius: 0.75rem;
  margin-bottom: 1rem;
  transition: box-shadow 0.2s ease-in-out;
}

.activity-entry:hover {
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.07);
}

.entry-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-color);
  background-color: #ffffff;
  border-radius: 0.75rem 0.75rem 0 0;
}

.entry-timestamp {
  font-size: 0.9rem;
  color: var(--text-secondary);
  font-weight: 500;
}

/* Badge activity type bisa menggunakan gaya yang sama dari sebelumnya */
.activity-type-badge {
    padding: 0.25rem 0.6rem;
    border-radius: 4px;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--ucla-blue);
    background-color: var(--non-photo-blue);
    text-transform: uppercase;
}

.entry-details {
  padding: 1rem;
}

.entry-details pre {
  margin: 0;
  white-space: pre-wrap;      /* Membuat teks panjang otomatis pindah baris */
  word-break: break-all;      /* Memecah kata/URL yang sangat panjang */
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.9rem;
  color: var(--delft-blue);
  line-height: 1.6;
}
/* .activity-table-container { max-height: 600px; overflow-y: auto; } */
/* .activity-table { 
    width: 100%; 
    border-collapse: collapse; 
    table-layout: fixed; /* KUNCI 1: Mengizinkan kita kontrol lebar kolom lebih baik */
/* } */
/* .activity-table th, .activity-table td { padding: 0.75rem 1rem; text-align: left; border-bottom: 1px solid var(--border-color); vertical-align: top; } */
/* .activity-table th { background: #f8fafc; font-weight: 600; position: sticky; top: 0; } */
/* .activity-table tbody tr:hover { background-color: #f1f5f9; } */
/* .timestamp-cell { width: 180px; font-size: 0.9rem; color: var(--text-secondary); white-space: nowrap;} */
/* .details-cell { font-family: 'Courier New', Courier, monospace; font-size: 0.9rem; color: var(--delft-blue); line-height: 1.5; word-break: break-word; } */
.activity-type-badge {
    padding: 0.25rem 0.6rem; border-radius: 4px; font-size: 0.8rem; font-weight: 600;
    color: var(--ucla-blue); background-color: var(--non-photo-blue); text-transform: uppercase;
}
.no-data { text-align: center; padding: 3rem 1rem; color: var(--text-secondary); }

/* Sidebar: Analysis Section */
.threat-analysis-card { display: flex; align-items: stretch; padding: 0; }
.threat-severity { text-align: center; padding: 2rem 1.5rem; color: white; display: flex; flex-direction: column; justify-content: center; border-radius: 1.5rem 0 0 1.5rem;}
.severity-score { font-size: 2.5rem; font-weight: 700; }
.severity-label { font-size: 1rem; opacity: 0.8; }
.severity-level { font-size: 0.9rem; font-weight: 600; text-transform: uppercase; margin-top: 0.25rem; }
.threat-ai-summary { padding: 1.5rem; flex-grow: 1; }
.threat-ai-summary h4, .geo-details + h3, .findings-section h4, .recommendations-section h4 { margin-top: 0; margin-bottom: 0.75rem; color: var(--delft-blue); }
.threat-ai-summary p { margin: 0; line-height: 1.6; }

/* Sidebar: Geolocation & AI Details */
.geo-details { display: flex; flex-direction: column; gap: 0.75rem; }
.geo-details span { padding: 0.5rem; background: #f8fafc; border-radius: 4px; }
.findings-list, .recommendations-list { list-style-type: none; padding-left: 0; }
.findings-list li, .recommendations-list li {
    padding-left: 1.75rem; position: relative; margin-bottom: 0.75rem; line-height: 1.5;
}
.findings-list li::before, .recommendations-list li::before {
    font-family: 'Font Awesome 6 Free'; font-weight: 900; position: absolute; left: 0; top: 2px;
}
.findings-list li::before { content: '\f105'; color: var(--ucla-blue); }
.recommendations-list li::before { content: '\f058'; color: #4ade80; }

/* Shared Risk Level Colors */
.risk-critical { background: #dc2626; border-color: #dc2626; } /* Red */
.risk-high { background: #f97316; border-color: #f97316; }   /* Orange */
.risk-medium { background: #facc15; border-color: #facc15; } /* Yellow */
.risk-low { background: #4ade80; border-color: #4ade80; }    /* Green */
.risk-medium.risk-badge { color: #422006;} /* Better text visibility on yellow */

/* Loading State */
.loading-overlay { display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 400px; gap: 1.5rem; color: var(--text-secondary); animation: fadeIn 0.3s; }
.spinner {
    width: 50px; height: 50px; border: 5px solid var(--non-photo-blue);
    border-top: 5px solid var(--ucla-blue); border-radius: 50%;
    animation: spin 1s linear infinite;
}
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

/* Responsive Grid Layout */
@media (max-width: 992px) {
  .results-grid {
    grid-template-columns: 1fr;
    grid-template-areas:
      "header"
      "main"
      "sidebar";
  }
}
@media (max-width: 768px) {
    .header-card { flex-direction: column; gap: 1rem; align-items: flex-start; }
    .threat-analysis-card { flex-direction: column; }
    .threat-severity { border-radius: 1.5rem 1.5rem 0 0; }
}

</style>