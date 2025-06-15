<template>
  <div class="monitored-ips-page card">
    <!-- Header & Toolbar -->
    <div class="page-header">
      <div class="header-content">
        <h2>Monitored IPs</h2>
        <span class="ip-count-badge">{{ filteredAndSortedIPs.length }} IP(s)</span>
      </div>
      <div class="toolbar">
        <div class="search-wrapper">
          <i class="icon-search"></i>
          <input 
            v-model="searchTerm" 
            type="text" 
            placeholder="Search by IP address..."
            class="search-input"
          />
        </div>
        <div class="sort-wrapper">
          <label for="sort-by">Sort by:</label>
          <select v-model="sortBy" id="sort-by" class="sort-select">
            <option value="risk_desc">Risk: High to Low</option>
            <option value="risk_asc">Risk: Low to High</option>
            <option value="address_asc">IP: Ascending</option>
            <option value="address_desc">IP: Descending</option>
          </select>
        </div>
        <div class="view-switcher">
          <button @click="viewMode = 'grid'" :class="{ active: viewMode === 'grid' }" title="Grid View">
            <i class="icon-grid"></i>
          </button>
          <button @click="viewMode = 'list'" :class="{ active: viewMode === 'list' }" title="List View">
            <i class="icon-list"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Konten Utama: Loading, Data, atau No Data -->
    <div class="content-area">
      <!-- Skeleton Loading State -->
      <div v-if="ipStore.loading" :class="viewMode === 'grid' ? 'ip-grid' : 'ip-list-table'">
        <template v-if="viewMode === 'grid'">
          <div v-for="n in 6" :key="n" class="ip-card-skeleton"></div>
        </template>
        <template v-else>
          <table>
            <thead><tr><th>IP Address</th><th>Risk</th><th>Location</th><th>Actions</th></tr></thead>
            <tbody>
              <tr v-for="n in 6" :key="n" class="ip-row-skeleton">
                <td><div class="skeleton-bar"></div></td>
                <td><div class="skeleton-bar"></div></td>
                <td><div class="skeleton-bar"></div></td>
                <td><div class="skeleton-bar"></div></td>
              </tr>
            </tbody>
          </table>
        </template>
      </div>
      
      <!-- Data Display -->
      <div v-else-if="filteredAndSortedIPs.length > 0">
        <!-- Grid View -->
        <div v-if="viewMode === 'grid'" class="ip-grid">
          <div v-for="ip in filteredAndSortedIPs" :key="ip._id" class="ip-card" @click="viewDetails(ip)">
            <div class="ip-card-header">
              <span class="ip-address-text">{{ ip.address }}</span>
              <div class="actions-menu-wrapper">
                 <button class="actions-btn" @click.stop.prevent="toggleMenu(ip._id)">
                  <i class="icon-ellipsis"></i>
                </button>
                <div v-if="activeMenu === ip._id" class="actions-dropdown">
                  <a @click.stop="stopMonitoring(ip.address)">Stop Monitoring</a>
                </div>
              </div>
            </div>
            <div class="risk-score-bar" :style="{ width: ip.aiAnalysis.riskScore + '%' }" :class="riskLevelClass(ip.aiAnalysis.riskScore)"></div>
            <div class="ip-card-body">
              <p class="summary-text">{{ ip.aiAnalysis.summary }}</p>
            </div>
            <div class="ip-card-footer">
              <span class="detail-item"><i class="icon-location"></i>{{ ip.geoLocation.city }}, {{ ip.geoLocation.country }}</span>
              <span :class="['status-badge', riskLevelClass(ip.aiAnalysis.riskScore)]">
                {{ getRiskLevel(ip.aiAnalysis.riskScore) }} - {{ ip.aiAnalysis.riskScore }}
              </span>
            </div>
          </div>
        </div>

        <!-- List/Table View -->
        <div v-else class="ip-list-table">
          <table>
            <thead>
              <tr>
                <th>IP Address</th>
                <th class="risk-col">Risk Score</th>
                <th>Risk Level</th>
                <th>Location</th>
                <th>Summary</th>
                <th class="actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="ip in filteredAndSortedIPs" :key="ip._id" @click="viewDetails(ip)">
                <td class="ip-address-cell">{{ ip.address }}</td>
                <td class="risk-col">
                  <div class="risk-score-visual">
                    <span>{{ ip.aiAnalysis.riskScore }}</span>
                    <div class="risk-score-bar-bg"><div class="risk-score-bar-inline" :style="{width: ip.aiAnalysis.riskScore + '%'}" :class="riskLevelClass(ip.aiAnalysis.riskScore)"></div></div>
                  </div>
                </td>
                <td>
                  <span :class="['status-badge', riskLevelClass(ip.aiAnalysis.riskScore)]">{{ getRiskLevel(ip.aiAnalysis.riskScore) }}</span>
                </td>
                <td>{{ ip.geoLocation.city }}, {{ ip.geoLocation.country }}</td>
                <td class="summary-cell">{{ ip.aiAnalysis.summary }}</td>
                <td class="actions-col">
                   <div class="actions-menu-wrapper">
                    <button class="actions-btn" @click.stop.prevent="toggleMenu(ip._id)">
                      <i class="icon-ellipsis"></i>
                    </button>
                    <div v-if="activeMenu === ip._id" class="actions-dropdown">
                      <a @click.stop="stopMonitoring(ip.address)">Stop Monitoring</a>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <!-- No Data State -->
      <div v-else class="no-data">
        <i class="icon-search-off"></i>
        <h3>No Monitored IPs Found</h3>
        <p v-if="searchTerm">Try adjusting your search term.</p>
        <p v-else>You are not monitoring any IPs yet. Start by investigating an IP address.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import { useIPStore, type IPData } from '../stores/ipStore';

const ipStore = useIPStore();
const router = useRouter();
const { monitoredIPs } = storeToRefs(ipStore);

// State untuk UI
const viewMode = ref<'grid' | 'list'>('grid');
const searchTerm = ref('');
const sortBy = ref('risk_desc');
const activeMenu = ref<string | null>(null);

const filteredAndSortedIPs = computed(() => {
  let ips = [...monitoredIPs.value];

  // 1. Filtering
  if (searchTerm.value) {
    ips = ips.filter(ip => 
      ip.address.toLowerCase().includes(searchTerm.value.toLowerCase())
    );
  }

  // 2. Sorting
  ips.sort((a, b) => {
    switch (sortBy.value) {
      case 'risk_asc':
        return a.aiAnalysis.riskScore - b.aiAnalysis.riskScore;
      case 'address_asc':
        return a.address.localeCompare(b.address);
      case 'address_desc':
        return b.address.localeCompare(a.address);
      case 'risk_desc':
      default:
        return b.aiAnalysis.riskScore - a.aiAnalysis.riskScore;
    }
  });

  return ips;
});


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

const viewDetails = (ip: IPData) => {
  activeMenu.value = null; // Tutup menu saat pindah halaman
  router.push({ name: 'IPDetails', params: { address: ip.address } });
};

const stopMonitoring = async (address: string) => {
  activeMenu.value = null; // Tutup menu setelah aksi
  try {
    await ipStore.stopMonitoring(address);
    await ipStore.loadMonitoredIPs(); // Muat ulang daftar setelah menghapus
  } catch (error) {
    console.error('Failed to stop monitoring:', error);
    // Tambahkan notifikasi error ke user jika perlu
  }
};

const toggleMenu = (ipId: string) => {
  activeMenu.value = activeMenu.value === ipId ? null : ipId;
};

onMounted(() => {
  if (monitoredIPs.value.length === 0) {
      ipStore.loadMonitoredIPs();
  }
  // Menutup menu jika user mengklik di luar area menu
  document.addEventListener('click', () => {
      activeMenu.value = null;
  });
});
</script>

<style scoped>
/* Ikon dari IPInvestigation, untuk konsistensi */
.icon-search::before { content: '\f002'; font-family: 'Font Awesome 6 Free'; font-weight: 900; }
.icon-grid::before { content: '\f00a'; font-family: 'Font Awesome 6 Free'; font-weight: 900; }
.icon-list::before { content: '\f00b'; font-family: 'Font Awesome 6 Free'; font-weight: 900; }
.icon-location::before { content: '\f3c5'; font-family: 'Font Awesome 6 Free'; font-weight: 900; margin-right: 0.4rem; }
.icon-ellipsis::before { content: '\f141'; font-family: 'Font Awesome 6 Free'; font-weight: 900; }
.icon-search-off::before { content: '\f05a'; font-family: 'Font Awesome 6 Free'; font-weight: 900; font-size: 3rem; color: var(--text-muted); }

/* Main Container */
.monitored-ips-page { display: flex; flex-direction: column; gap: 1.5rem; }

/* Header & Toolbar */
.page-header { border-bottom: 1px solid var(--border-color); padding-bottom: 1.5rem; }
.header-content { display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; }
.header-content h2 { margin: 0; }
.ip-count-badge { background-color: var(--mint-green); color: var(--ucla-blue); font-weight: 600; padding: 0.25rem 0.75rem; border-radius: 50px; font-size: 0.9rem; }
.toolbar {
  display: flex;
  gap: 1.5rem; /* Beri sedikit lebih banyak ruang */
  align-items: center;
  flex-wrap: wrap; /* SANGAT PENTING: Izinkan item pindah ke baris baru */
}
.search-wrapper {
  position: relative;
  flex-grow: 1;       /* BIARKAN INI, tetapi kita akan tambahkan min-width */
  min-width: 250px;   /* TAMBAHKAN INI: Tentukan lebar minimum sebelum menyusut/membungkus */
}
.search-wrapper .icon-search { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: var(--text-muted); }
.search-input { width: 92%; padding: 0.65rem 1rem 0.65rem 2.5rem; border-radius: 2rem; border: 1px solid var(--border-color); }
.sort-wrapper, .view-switcher { display: flex; align-items: center; gap: 0.5rem; }
.sort-select { padding: 0.65rem 1rem; border-radius: 2rem; border: 1px solid var(--border-color); }
.view-switcher button { background: transparent; border: 1px solid var(--border-color); color: var(--text-secondary); border-radius: 50%; width: 38px; height: 38px; display: flex; justify-content: center; align-items: center; cursor: pointer; }
.view-switcher button.active { background: var(--ucla-blue); color: white; border-color: var(--ucla-blue); }

/* Content Area & States */
.content-area { min-height: 400px; }
.no-data { text-align: center; padding: 4rem 1rem; }
.no-data h3 { margin: 1rem 0 0.5rem; }

/* Grid View */
.ip-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem; }
.ip-card {
  display: flex; flex-direction: column; background: var(--surface-color); border: 1px solid var(--border-color); 
  border-radius: 1rem; cursor: pointer; transition: all 0.2s; position: relative; overflow: hidden;
}
.ip-card:hover { transform: translateY(-5px); box-shadow: var(--card-shadow); }
.ip-card-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1rem 0.5rem; }
.ip-address-text { font-weight: 600; font-size: 1.2rem; font-family: 'Courier New', monospace; color: var(--delft-blue); }
.risk-score-bar { height: 4px; transition: width 0.3s ease; }
.ip-card-body { padding: 1rem; flex-grow: 1; }
.summary-text { font-size: 0.9rem; color: var(--text-secondary); line-height: 1.5; margin: 0; }
.ip-card-footer { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 1rem 1rem; border-top: 1px solid var(--border-color); font-size: 0.85rem; color: var(--text-secondary); }

/* Table View */
.ip-list-table table { width: 100%; border-collapse: collapse; }
.ip-list-table th, .ip-list-table td { padding: 1rem; text-align: left; border-bottom: 1px solid var(--border-color); }
.ip-list-table tbody tr { cursor: pointer; transition: background-color 0.2s; }
.ip-list-table tbody tr:hover { background-color: #f8fafc; }
.ip-address-cell { font-family: 'Courier New', monospace; font-weight: 600; }
.risk-col { width: 150px; }
.risk-score-visual { display: flex; align-items: center; gap: 0.5rem; }
.risk-score-bar-bg { flex-grow: 1; height: 8px; background-color: #e2e8f0; border-radius: 4px; overflow: hidden;}
.risk-score-bar-inline { height: 100%; border-radius: 4px; }
.summary-cell { max-width: 300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* Shared: Actions Menu */
.actions-menu-wrapper { position: relative; }
.actions-btn { background: none; border: none; cursor: pointer; color: var(--text-muted); padding: 0.25rem 0.5rem; border-radius: 4px; }
.actions-btn:hover { background: #f1f5f9; color: var(--text-primary); }
.actions-dropdown { position: absolute; top: 100%; right: 0; background: white; border-radius: 0.5rem; box-shadow: var(--card-shadow); padding: 0.5rem 0; z-index: 10; width: 150px; }
.actions-dropdown a { display: block; padding: 0.5rem 1rem; color: var(--text-primary); text-decoration: none; }
.actions-dropdown a:hover { background-color: #f1f5f9; }

/* Shared: Status Badge & Risk Colors */
.status-badge { padding: 0.2rem 0.6rem; border-radius: 2rem; color: white; font-weight: 500; font-size: 0.8rem; }
.risk-critical { background: #dc2626; border-color: #dc2626; } /* Red */
.risk-high { background: #f97316; border-color: #f97316; }   /* Orange */
.risk-medium { background: #facc15; color: #422006;} /* Yellow with dark text */
.risk-low { background: #4ade80; border-color: #4ade80; }    /* Green */
.risk-medium.status-badge { color: #422006; }

/* Skeleton Loading */
@keyframes shimmer { 0% { background-position: -1000px 0; } 100% { background-position: 1000px 0; } }
.ip-card-skeleton {
    background: #f6f7f8; background-image: linear-gradient(to right, #f6f7f8 0%, #edeef1 20%, #f6f7f8 40%, #f6f7f8 100%);
    background-repeat: no-repeat; background-size: 2000px 104px; animation: shimmer 2s linear infinite;
    border-radius: 1rem; min-height: 200px;
}
.ip-row-skeleton .skeleton-bar {
    height: 20px; border-radius: 4px; background: #f6f7f8; background-image: linear-gradient(to right, #f6f7f8 0%, #edeef1 20%, #f6f7f8 40%, #f6f7f8 100%);
    background-repeat: no-repeat; background-size: 2000px 104px; animation: shimmer 2s linear infinite;
}
</style>