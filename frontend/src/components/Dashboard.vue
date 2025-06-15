<!-- frontend/src/components/Dashboard.vue -->
<template>
  <div class="dashboard-page">
    <!-- Header -->
    <h2 class="page-title">Security Dashboard</h2>

    <!-- Skeleton Loading State -->
    <div v-if="isLoading" class="dashboard-grid">
      <div v-for="n in 5" :key="n" class="card skeleton-card"></div>
    </div>

    <!-- Dashboard Grid -->
    <div v-else class="dashboard-grid">
      <!-- Summary Cards -->
      <div class="stat-card card risk-critical">
        <div class="icon-wrapper"><i class="icon-critical"></i></div>
        <div class="stat-content">
          <div class="stat-value">{{ highRiskCount('Critical') }}</div>
          <div class="stat-label">Critical Risk IPs</div>
        </div>
      </div>
      <div class="stat-card card risk-high">
        <div class="icon-wrapper"><i class="icon-high"></i></div>
        <div class="stat-content">
          <div class="stat-value">{{ highRiskCount('High') }}</div>
          <div class="stat-label">High Risk IPs</div>
        </div>
      </div>
      <div class="stat-card card risk-medium">
        <div class="icon-wrapper"><i class="icon-total"></i></div>
        <div class="stat-content">
          <div class="stat-value">{{ monitoredIPs.length }}</div>
          <div class="stat-label">Total Monitored IPs</div>
        </div>
      </div>
      <div class="stat-card card risk-low">
        <div class="icon-wrapper"><i class="icon-activity"></i></div>
        <div class="stat-content">
          <div class="stat-value">{{ recentActivities.length }}</div>
          <div class="stat-label">Recent Activities</div>
        </div>
      </div>

      <!-- Risk Distribution Chart (Main Widget) -->
      <div class="card chart-card">
        <h3>Risk Level Distribution</h3>
        <div class="chart-container">
            <Doughnut v-if="chartData.datasets[0].data.some(d => d > 0)" :data="chartData" :options="chartOptions" />
             <div v-else class="no-data-chart">
                <i class="icon-chart-empty"></i>
                <p>No data to display. Monitor some IPs to see distribution.</p>
            </div>
        </div>
      </div>
      
      <!-- Recent Activity Feed (Side Widget) -->
      <div class="card feed-card">
        <h3>Recent Activity Feed</h3>
        <div class="activity-feed">
          <div v-if="recentActivities.length > 0" class="activity-list">
            <div v-for="activity in recentActivities" :key="activity.id" class="activity-item">
              <div class="timeline-dot" :class="getRiskClassForType(activity.type)"></div>
              <div class="activity-content">
                <p class="activity-summary">
                  <strong>{{ activity.type }}</strong> on 
                  <router-link :to="`/investigation/${activity.monitoredIP}`" class="ip-link">{{ activity.monitoredIP }}</router-link>
                </p>
                <p class="activity-time">{{ formatDate(activity.timestamp) }}</p>
              </div>
            </div>
          </div>
          <div v-else class="no-data-feed">
            <i class="icon-feed-empty"></i>
            <p>Activity feed is quiet.</p>
          </div>
        </div>
      </div>

      <!-- Geographic Distribution Table (Wide Widget) -->
      <div class="card geo-card">
        <h3>Top Monitored Countries</h3>
         <div v-if="topCountries.length > 0" class="geo-table-container">
          <table class="geo-table">
            <thead>
              <tr>
                <th>Country</th>
                <th>IP Count</th>
                <th>Average Risk</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="country in topCountries" :key="country.name">
                <td class="country-cell">
                  <span :class="['flag-icon', 'fi', `fi-${getCountryCode(country.name).toLowerCase()}`]"></span>
                  {{ country.name }}
                </td>
                <td>{{ country.ipCount }}</td>
                <td>
                  <div class="risk-bar-container">
                    <div class="risk-bar" :class="getRiskClass(country.avgRisk)" :style="{ width: country.avgRisk + '%' }"></div>
                    <span class="risk-bar-value">{{ country.avgRisk.toFixed(0) }}</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
         </div>
         <div v-else class="no-data-feed">
            <i class="icon-globe-empty"></i>
            <p>No geographic data to analyze.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useIPStore } from '../stores/ipStore';
import { formatDate } from '../utils/dateFormatter';
// Impor Chart.js dan komponen Doughnut
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'vue-chartjs';
// CSS untuk bendera (opsional, tapi keren!)
import 'flag-icons/css/flag-icons.min.css';
import countryMapping from '../utils/countryMapping';

ChartJS.register(ArcElement, Tooltip, Legend);

const ipStore = useIPStore();
const { monitoredIPs } = storeToRefs(ipStore);
const isLoading = ref(true);

onMounted(async () => {
  isLoading.value = true;
  if (monitoredIPs.value.length === 0) {
    await ipStore.loadMonitoredIPs();
  }
  isLoading.value = false;
});

// const riskLevels = [
//   { name: 'Critical', class: 'risk-critical' },
//   { name: 'High', class: 'risk-high' },
//   { name: 'Medium', class: 'risk-medium' },
//   { name: 'Low', class: 'risk-low' }
// ];

const highRiskCount = (level: 'Critical' | 'High') => {
    const minScore = level === 'Critical' ? 80 : 60;
    const maxScore = level === 'Critical' ? 101 : 80;
    return monitoredIPs.value.filter(ip => ip.aiAnalysis.riskScore >= minScore && ip.aiAnalysis.riskScore < maxScore).length;
};

const getRiskCount = (levelName: string) => {
  const { min, max } = {
    'Critical': { min: 80, max: 101 },
    'High': { min: 60, max: 80 },
    'Medium': { min: 40, max: 60 },
    'Low': { min: 0, max: 40 }
  }[levelName] || { min: 0, max: 0 };
  
  return monitoredIPs.value.filter(ip => ip.aiAnalysis.riskScore >= min && ip.aiAnalysis.riskScore < max).length;
};

// const getRiskPercentage = (levelName: string) => {
//   const count = getRiskCount(levelName);
//   return monitoredIPs.value.length > 0 ? (count / monitoredIPs.value.length) * 100 : 0;
// };

const recentActivities = computed(() => {
  const allActivities = [];
  for (const ip of monitoredIPs.value) {
    if (ip.detectedActivities) {
      for (const activity of ip.detectedActivities) {
        allActivities.push({
          ...activity,
          monitoredIP: ip.address,
          id: `${ip.address}-${activity.timestamp}-${activity.details}`
        });
      }
    }
  }
  return allActivities
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 7); // Max 7 item untuk feed
});

// const getActivityIcon = (type: string) => {
//   const icons: { [key: string]: string } = {
//     SSH_FAILURE: '🛡️',
//     PORT_SCAN: '🔍',
//     FIREWALL_BLOCK: '🧱',
//     MALICIOUS_REQUEST: '🐛',
//     UNKNOWN: '❓'
//   };
//   return icons[type] || '📝';
// };

const topCountries = computed(() => {
  const countries = new Map<string, { ipCount: number; totalRisk: number }>();
  
  monitoredIPs.value.forEach(ip => {
    const country = ip.geoLocation.country || 'Unknown';
    if (!countries.has(country)) {
      countries.set(country, { ipCount: 0, totalRisk: 0 });
    }
    const data = countries.get(country)!;
    data.ipCount++;
    data.totalRisk += ip.aiAnalysis.riskScore;
  });

  return Array.from(countries.entries())
    .map(([name, data]) => ({
      name,
      ipCount: data.ipCount,
      avgRisk: data.totalRisk / data.ipCount
    }))
    .sort((a, b) => b.ipCount - a.ipCount)
    .slice(0, 5);
});

const getRiskClass = (score: number) => {
  if (score >= 80) return 'risk-critical';
  if (score >= 60) return 'risk-high';
  if (score >= 40) return 'risk-medium';
  return 'risk-low';
};

const getCountryCode = (countryName: string): string => {
  return countryMapping[countryName] || 'xx'; // 'xx' untuk bendera default/tidak dikenal
};

const getRiskClassForType = (type: string) => {
  const mapping: {[key: string]: string} = {
    SSH_FAILURE: 'risk-high',
    PORT_SCAN: 'risk-medium',
    MALICIOUS_REQUEST: 'risk-critical',
  }
  return mapping[type] || 'risk-low';
};

const chartData = computed(() => ({
  labels: ['Critical', 'High', 'Medium', 'Low'],
  datasets: [{
    backgroundColor: ['#dc2626', '#f97316', '#facc15', '#4ade80'],
    data: [
      getRiskCount('Critical'),
      getRiskCount('High'),
      getRiskCount('Medium'),
      getRiskCount('Low'),
    ]
  }]
}));

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
    }
  }
};
</script>
<style scoped>
/* Tambahkan ikon baru untuk dashboard */
@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css');
.icon-critical::before { content: '\f071'; font-family: 'Font Awesome 6 Free'; font-weight: 900; }
.icon-high::before { content: '\f06d'; font-family: 'Font Awesome 6 Free'; font-weight: 900; }
.icon-total::before { content: '\f52c'; font-family: 'Font Awesome 6 Free'; font-weight: 900; }
.icon-activity::before { content: '\f1da'; font-family: 'Font Awesome 6 Free'; font-weight: 900; }
.icon-chart-empty::before, .icon-feed-empty::before, .icon-globe-empty::before { 
    font-family: 'Font Awesome 6 Free'; font-weight: 900; 
    font-size: 3rem; display: block; margin-bottom: 1rem; color: #cbd5e1;
}
.icon-chart-empty::before { content: '\f200'; }
.icon-feed-empty::before { content: '\f4f8'; }
.icon-globe-empty::before { content: '\f57d'; }


/* General Layout */
.dashboard-page { display: flex; flex-direction: column; gap: 1.5rem; }
.page-title { color: var(--delft-blue); }
.dashboard-grid {
    display: grid;
    gap: 1.5rem;
    grid-template-columns: repeat(4, 1fr);
    grid-template-areas:
        "stat1 stat2 stat3 stat4"
        "chart chart feed feed"
        "geo geo geo geo";
}

/* Grid Area Assignments */
.stat-card:nth-child(1) { grid-area: stat1; }
.stat-card:nth-child(2) { grid-area: stat2; }
.stat-card:nth-child(3) { grid-area: stat3; }
.stat-card:nth-child(4) { grid-area: stat4; }
.chart-card { grid-area: chart; }
.feed-card { grid-area: feed; }
.geo-card { grid-area: geo; }

/* Stat Cards */
.stat-card {
    display: flex; align-items: center; padding: 1.5rem; color: white;
    border-radius: 1rem; border: none; border-left: 5px solid rgba(255,255,255,0.5);
}
.stat-card .icon-wrapper { font-size: 2rem; margin-right: 1.5rem; opacity: 0.7; }
.stat-value { font-size: 2.25rem; font-weight: 700; }
.stat-label { font-size: 0.9rem; opacity: 0.9; }

/* Chart Card */
.chart-card, .feed-card { display: flex; flex-direction: column; }
.chart-container { flex-grow: 1; position: relative; min-height: 250px; display: flex; align-items: center; justify-content: center; padding: 1rem; }

/* Activity Feed Card */
.activity-feed { flex-grow: 1; max-height: 350px; overflow-y: auto; padding-right: 0.5rem;}
.activity-list { position: relative; padding-left: 1rem; }
.activity-item { display: flex; gap: 1rem; padding: 0.75rem 0; border-left: 2px solid var(--border-color); margin-left: 6px; }
.activity-item:first-child { border-top-left-radius: 8px; }
.activity-item:last-child { border-bottom-left-radius: 8px; }
.timeline-dot {
    width: 14px; height: 14px; border-radius: 50%; position: absolute;
    left: -8px; border: 2px solid white;
}
.activity-content { flex-grow: 1; }
.activity-summary { margin: 0 0 0.25rem; font-size: 0.9rem; }
.ip-link { font-weight: 600; text-decoration: none; color: var(--ucla-blue); }
.activity-time { font-size: 0.8rem; color: var(--text-muted); }

/* Geo Card Table */
.geo-table-container { overflow-x: auto; }
.geo-table { width: 100%; border-collapse: collapse; }
.geo-table th, .geo-table td { padding: 1rem; text-align: left; border-bottom: 1px solid var(--border-color); }
.geo-table th { background: #f8fafc; font-weight: 600; }
.country-cell { display: flex; align-items: center; gap: 1rem; font-weight: 500; }
.flag-icon { font-size: 1.5rem; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.risk-bar-container { display: flex; align-items: center; gap: 0.5rem; }
.risk-bar { height: 10px; border-radius: 5px; }
.risk-bar-value { font-size: 0.9rem; font-weight: 500; }


/* Shared Styles */
.card h3 { margin-top: 0; color: var(--delft-blue); }
.no-data-chart, .no-data-feed { text-align: center; color: var(--text-muted); flex-grow: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; }
.risk-critical { background: #dc2626; border-color: #dc2626; } /* Red */
.risk-high { background: #f97316; border-color: #f97316; }   /* Orange */
.risk-medium { background: #facc15; } /* Yellow */
.risk-low { background: #4ade80; }    /* Green */


/* Skeleton Loading */
@keyframes shimmer { 0% { background-position: -1000px 0; } 100% { background-position: 1000px 0; } }
.skeleton-card {
    min-height: 120px;
    background: #f6f7f8; background-image: linear-gradient(to right, #f6f7f8 0%, #edeef1 20%, #f6f7f8 40%, #f6f7f8 100%);
    background-repeat: no-repeat; background-size: 2000px 100%; animation: shimmer 2s linear infinite;
}
.chart-card.skeleton-card, .feed-card.skeleton-card, .geo-card.skeleton-card { min-height: 300px; }


/* Responsive Adjustments */
@media (max-width: 1200px) {
    .dashboard-grid {
        grid-template-areas:
            "stat1 stat2"
            "stat3 stat4"
            "chart chart"
            "feed feed"
            "geo geo";
    }
}
@media (max-width: 768px) {
    .dashboard-grid {
        grid-template-columns: 1fr;
        grid-template-areas:
            "stat1" "stat2" "stat3" "stat4"
            "chart" "feed" "geo";
    }
}
</style>