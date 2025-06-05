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
          <h3>High Risk IPs</h3>
          <div class="stat-value">{{ highRiskCount }}</div>
        </div>
        <div class="card stats-card">
          <h3>Recent Alerts</h3>
          <div class="stat-value">{{ recentAlertsCount }}</div>
        </div>
      </div>

      <!-- Risk Distribution -->
      <div class="card risk-distribution">
        <h3>Risk Level Distribution</h3>
        <div class="risk-bars">
          <div 
            v-for="level in riskLevels" 
            :key="level.name"
            class="risk-bar"
          >
            <div 
              class="bar" 
              :class="level.class"
              :style="{ height: `${getRiskPercentage(level.threshold)}%` }"
            ></div>
            <span class="label">{{ level.name }}</span>
          </div>
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="card recent-activity">
        <h3>Recent Activity</h3>
        <div class="activity-list">
          <div v-for="activity in recentActivities" :key="activity.id" class="activity-item">
            <div class="activity-icon" :class="activity.type">
              {{ getActivityIcon(activity.type) }}
            </div>
            <div class="activity-content">
              <div class="activity-title">{{ activity.title }}</div>
              <div class="activity-time">{{ formatDate(activity.timestamp) }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Geographic Distribution -->
      <div class="card geo-distribution">
        <h3>Geographic Distribution</h3>
        <table class="geo-table">
          <thead>
            <tr>
              <th>Country</th>
              <th>IPs</th>
              <th>Risk Level</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="country in topCountries" :key="country.name">
              <td>{{ country.name }}</td>
              <td>{{ country.ipCount }}</td>
              <td>
                <span :class="['risk-badge', getRiskClass(country.avgRisk)]">
                  {{ getRiskLevel(country.avgRisk) }}
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
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useIPStore } from '../stores/ipStore';
import { formatDate } from '../utils/dateFormatter';

const ipStore = useIPStore();
const { monitoredIPs } = storeToRefs(ipStore);

const riskLevels = [
  { name: 'Critical', threshold: 80, class: 'risk-critical' },
  { name: 'High', threshold: 60, class: 'risk-high' },
  { name: 'Medium', threshold: 40, class: 'risk-medium' },
  { name: 'Low', threshold: 0, class: 'risk-low' }
];

const highRiskCount = computed(() => 
  monitoredIPs.value.filter(ip => ip.aiAnalysis.riskScore >= 60).length
);

const recentAlertsCount = computed(() => 
  monitoredIPs.value.reduce((count, ip) => 
    count + (ip.monitoring?.alerts?.length || 0), 0)
);

const getRiskPercentage = (threshold: number) => {
  const count = monitoredIPs.value.filter(ip => ip.aiAnalysis.riskScore >= threshold).length;
  return monitoredIPs.value.length ? (count / monitoredIPs.value.length) * 100 : 0;
};

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'alert': return '⚠️';
    case 'monitor': return '👁️';
    case 'investigate': return '🔍';
    default: return '📝';
  }
};

const recentActivities = computed(() => {
  // Simulated activities - replace with real data
  return [
    { id: 1, type: 'alert', title: 'High risk IP detected', timestamp: new Date() },
    { id: 2, type: 'monitor', title: 'Started monitoring new IP', timestamp: new Date() },
    { id: 3, type: 'investigate', title: 'IP investigation completed', timestamp: new Date() }
  ];
});

const topCountries = computed(() => {
  const countries = new Map();
  
  monitoredIPs.value.forEach(ip => {
    const country = ip.geoLocation.country;
    if (!countries.has(country)) {
      countries.set(country, { ipCount: 0, totalRisk: 0 });
    }
    const data = countries.get(country);
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

const getRiskLevel = (score: number) => {
  if (score >= 80) return 'Critical';
  if (score >= 60) return 'High';
  if (score >= 40) return 'Medium';
  return 'Low';
};

const getRiskClass = (score: number) => {
  if (score >= 80) return 'risk-critical';
  if (score >= 60) return 'risk-high';
  if (score >= 40) return 'risk-medium';
  return 'risk-low';
};
</script>

<style scoped>
.dashboard {
  padding: 1rem;
}

.grid-container {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
}

.summary-cards {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

.stats-card {
  text-align: center;
}

.stat-value {
  font-size: 2.5rem;
  font-weight: 600;
  color: var(--primary-color);
  margin-top: 0.5rem;
}

.risk-distribution {
  height: 300px;
}

.risk-bars {
  display: flex;
  justify-content: space-around;
  align-items: flex-end;
  height: 200px;
  margin-top: 2rem;
}

.risk-bar {
  width: 60px;
  text-align: center;
}

.bar {
  width: 100%;
  transition: height 0.3s ease;
  border-radius: 4px 4px 0 0;
}

.label {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.activity-list {
  max-height: 300px;
  overflow-y: auto;
}

.activity-item {
  display: flex;
  align-items: center;
  padding: 0.75rem;
  border-bottom: 1px solid var(--border-color);
}

.activity-icon {
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  margin-right: 1rem;
  font-size: 1.25rem;
}

.activity-content {
  flex: 1;
}

.activity-title {
  font-weight: 500;
}

.activity-time {
  font-size: 0.875rem;
  color: var(--text-muted);
}

.geo-table {
  width: 100%;
  border-collapse: collapse;
}

.geo-table th,
.geo-table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
}

.risk-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.risk-critical { background: var(--error-color); color: white; }
.risk-high { background: var(--warning-color); color: white; }
.risk-medium { background: var(--info-color); color: white; }
.risk-low { background: var(--success-color); color: white; }
</style>
