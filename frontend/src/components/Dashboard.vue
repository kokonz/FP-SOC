<!-- frontend/src/components/Dashboard.vue -->
<template>
  <div class="dashboard">
    <div class="grid-container">
      <!-- Summary Cards -->
      <div class="summary-cards">
        <div class="card stats-card">
          <h3>Total Monitored IPs</h3>
          <div class="stat-value">{{ monitoredIPs.length }}</div>
        </div>
        <div class="card stats-card">
          <h3>High Risk IPs (>=60)</h3>
          <div class="stat-value">{{ highRiskCount }}</div>
        </div>
        <div class="card stats-card">
          <h3>Recent Activities (24h)</h3>
          <div class="stat-value">{{ recentActivities.length }}</div>
        </div>
      </div>

      <!-- Risk Distribution -->
      <div class="card risk-distribution">
        <h3>Risk Level Distribution</h3>
        <div class="risk-bars">
          <div v-for="level in riskLevels" :key="level.name" class="risk-bar">
            <div class="bar-container">
              <div 
                class="bar" 
                :class="level.class"
                :style="{ height: `${getRiskPercentage(level.name)}%` }"
                :title="`${getRiskCount(level.name)} IPs`"
              ></div>
            </div>
            <span class="label">{{ level.name }}</span>
          </div>
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="card recent-activity">
        <h3>Recent Activity Stream</h3>
        <div class="activity-list">
          <div v-if="recentActivities.length > 0">
            <div v-for="activity in recentActivities" :key="activity.id" class="activity-item">
              <div class="activity-icon" :class="`icon-${activity.type.toLowerCase()}`">
                {{ getActivityIcon(activity.type) }}
              </div>
              <div class="activity-content">
                <div class="activity-title">
                  <strong>{{ activity.type }}</strong> on 
                  <router-link :to="`/ip/${activity.monitoredIP}`">{{ activity.monitoredIP }}</router-link>
                </div>
                <div class="activity-details">
                  from {{ activity.sourceIP }} - <span class="time">{{ formatDate(activity.timestamp) }}</span>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="no-data">
            No recent activities detected across all monitored IPs.
          </div>
        </div>
      </div>

      <!-- Geographic Distribution -->
      <div class="card geo-distribution">
        <h3>Top 5 Monitored Countries</h3>
        <table class="geo-table">
          <thead>
            <tr>
              <th>Country</th>
              <th>IPs</th>
              <th>Avg. Risk</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="country in topCountries" :key="country.name">
              <td>{{ country.name }}</td>
              <td>{{ country.ipCount }}</td>
              <td>
                <span :class="['risk-badge', getRiskClass(country.avgRisk)]">
                  {{ country.avgRisk.toFixed(0) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useIPStore } from '../stores/ipStore';
import { formatDate } from '../utils/dateFormatter';

const ipStore = useIPStore();
const { monitoredIPs } = storeToRefs(ipStore);

onMounted(() => {
  if (ipStore.monitoredIPs.length === 0) {
    ipStore.loadMonitoredIPs();
  }
});

const riskLevels = [
  { name: 'Critical', class: 'risk-critical' },
  { name: 'High', class: 'risk-high' },
  { name: 'Medium', class: 'risk-medium' },
  { name: 'Low', class: 'risk-low' }
];

const highRiskCount = computed(() => 
  monitoredIPs.value.filter(ip => ip.aiAnalysis.riskScore >= 60).length
);

const getRiskCount = (levelName: string) => {
  const { min, max } = {
    'Critical': { min: 80, max: 101 },
    'High': { min: 60, max: 80 },
    'Medium': { min: 40, max: 60 },
    'Low': { min: 0, max: 40 }
  }[levelName] || { min: 0, max: 0 };
  
  return monitoredIPs.value.filter(ip => ip.aiAnalysis.riskScore >= min && ip.aiAnalysis.riskScore < max).length;
};

const getRiskPercentage = (levelName: string) => {
  const count = getRiskCount(levelName);
  return monitoredIPs.value.length > 0 ? (count / monitoredIPs.value.length) * 100 : 0;
};

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
    .slice(0, 10); // Show top 10 most recent activities
});

const getActivityIcon = (type: string) => {
  const icons: { [key: string]: string } = {
    SSH_FAILURE: '🛡️',
    PORT_SCAN: '🔍',
    FIREWALL_BLOCK: '🧱',
    MALICIOUS_REQUEST: '🐛',
    UNKNOWN: '❓'
  };
  return icons[type] || '📝';
};

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
</script>

<style scoped>
.dashboard { padding: 1rem; }
.grid-container { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; }
.summary-cards { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
.stats-card { text-align: center; }
.stat-value { font-size: 2.5rem; font-weight: 600; color: var(--primary-color); margin-top: 0.5rem; }
.risk-distribution { height: 300px; display: flex; flex-direction: column; }
.risk-bars { display: flex; justify-content: space-around; align-items: flex-end; height: 100%; margin-top: 1rem; }
.risk-bar { display: flex; flex-direction: column; align-items: center; width: 60px; }
.bar-container { height: 100%; display: flex; align-items: flex-end; }
.bar { width: 40px; transition: height 0.3s ease; border-radius: 4px 4px 0 0; }
.label { margin-top: 0.5rem; font-size: 0.875rem; color: var(--text-secondary); }
.activity-list { max-height: 250px; overflow-y: auto; }
.activity-item { display: flex; align-items: center; padding: 0.75rem; border-bottom: 1px solid var(--border-color); }
.activity-icon { width: 2.5rem; height: 2.5rem; display: flex; align-items: center; justify-content: center; border-radius: 50%; margin-right: 1rem; font-size: 1.25rem; }
.activity-content { flex: 1; }
.activity-title { font-weight: 500; }
.activity-details { font-size: 0.875rem; color: var(--text-muted); }
.geo-table { width: 100%; border-collapse: collapse; }
.geo-table th, .geo-table td { padding: 0.75rem; text-align: left; border-bottom: 1px solid var(--border-color); }
.risk-badge { padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.8rem; font-weight: 500; color: white; }
.risk-critical { background: var(--error-color); }
.risk-high { background: var(--warning-color); }
.risk-medium { background: var(--info-color); }
.risk-low { background: var(--success-color); }
.no-data { text-align: center; color: var(--text-muted); padding: 2rem; }
</style>