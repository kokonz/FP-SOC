<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const isSticky = ref(false);
// const isFooterVisible = ref(false);
const navbarWrapper = ref<HTMLElement | null>(null);
// const footerWrapper = ref<HTMLElement | null>(null);

const checkPositions = () => {
  // Check navbar
  if (navbarWrapper.value) {
    const rect = navbarWrapper.value.getBoundingClientRect();
    isSticky.value = rect.top <= 0;
  }

//   // Check footer
//   if (footerWrapper.value) {
//     const windowHeight = window.innerHeight;
//     const rect = footerWrapper.value.getBoundingClientRect();
//     isFooterVisible.value = rect.top <= windowHeight;
//   }
};

onMounted(() => {
  window.addEventListener('scroll', checkPositions);
  // Initial check
  checkPositions();
});

onUnmounted(() => {
  window.removeEventListener('scroll', checkPositions);
});
</script>

<template>
  <div class="app">
    <div ref="navbarWrapper" class="navbar-wrapper" :class="{ 'sticky': isSticky }">
      <nav class="navbar">
        <div class="navbar-brand">
          <h1>IP Investigation System</h1>
        </div>
        <div class="nav-links">
          <router-link to="/" class="nav-link">Investigation</router-link>
          <router-link to="/monitored" class="nav-link">Monitored IPs</router-link>
          <router-link to="/dashboard" class="nav-link">Dashboard</router-link>
        </div>
      </nav>
    </div>

    <main class="main-content">
      <router-view></router-view>
    </main>    
    
    <!-- Footer Wrapper: meniru gaya navbar-wrapper -->
    <div class="footer-wrapper">
      <footer class="footer">
        <p>© 2025 IP Investigation System</p>
      </footer>
    </div>
  </div>
</template>

<style>
@import './styles/investigation.css';
@import './styles/animations.css';

:root {
  /* Color Palette */
  --poppy: #D64045;
  --mint-green: #E9FFF9;
  --non-photo-blue: #9ED8DB;
  --ucla-blue: #467599;
  --delft-blue: #1D3354;
  
  /* Gradients */
  --gradient-primary: linear-gradient(135deg, var(--ucla-blue), var(--delft-blue));
  --gradient-secondary: linear-gradient(135deg, var(--non-photo-blue), var(--mint-green));
  --gradient-accent: linear-gradient(135deg, var(--poppy), var(--ucla-blue));
  
  /* Background Colors */
  --background-color: var(--mint-green);
  --surface-color: #ffffff;
  
  /* Text Colors */
  --text-primary: var(--delft-blue);
  --text-secondary: var(--ucla-blue);
  --text-muted: var(--non-photo-blue);
  
  /* Border Colors */
  --border-color: var(--non-photo-blue);
  
  /* Shadows and Effects */
  --card-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  --transition-speed: 0.3s;
}

body {
  margin: 0;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  -webkit-font-smoothing: antialiased;
  background-color: var(--background-color);
  color: var(--text-primary);
}

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app {
  padding-top: 1rem;
}

.navbar-wrapper {
  position: sticky;
  top: 0;
  z-index: 1000;
  padding: 0 1rem;
  transition: padding 0.3s ease-in-out;
  background: transparent;
}

.navbar-wrapper.sticky {
  padding: 0;
}

.navbar {
  background: var(--gradient-primary);
  padding: 1.5rem 4rem;
  border-radius: 1.5rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  animation: fadeInDown 0.6s ease-out;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease-in-out;
}

.navbar-wrapper.sticky .navbar {
  border-radius: 0 0 1.5rem 1.5rem;
}

.navbar-brand h1 {
  margin: 0;
  font-size: 2rem;
  color: var(--mint-green);
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
  font-weight: 600;
  margin-right: 3rem;
}

.nav-links {
  display: flex;
  gap: 2rem;
  margin-left: auto;
}

.nav-link {
  text-decoration: none;
  color: var(--mint-green);
  font-weight: 500;
  padding: 0.75rem 1.5rem;
  border-radius: 2rem;
  transition: all var(--transition-speed);
  position: relative;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(5px);
}

.nav-link:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  background: var(--poppy);
}

.nav-link.router-link-active {
  background: var(--gradient-accent);
  color: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.main-content {
  flex: 1;
  padding: 1rem 2rem;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
  animation: fadeIn 0.6s ease-out;
  position: relative;
  z-index: 1;
}

.main-content::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 80%;
  height: 1px;
  background: var(--gradient-secondary);
}

.footer {
  /* Tiru gaya .navbar */
  background: var(--gradient-primary);
  padding: 1.5rem 4rem;
  border-radius: 1.5rem; /* Bentuk kartu penuh */
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  
  /* Styling spesifik footer */
  text-align: center;
  color: var(--mint-green);
  font-weight: 500;
  
  /* Animasi yang sama, tetapi dari bawah (simetris dengan navbar) */
  animation: fadeInUp 0.6s ease-out;
}

/* Animasi untuk footer, kebalikan dari fadeInDown */
@keyframes fadeInUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* Tambahkan ini ke file animations.css atau biarkan di sini */
@keyframes fadeInDown {
  from {
    transform: translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* TAMBAHKAN aturan baru ini di dalam <style> Anda */
.footer-wrapper {
  /* Beri ruang di bagian bawah agar konten tidak tertutup footer saat muncul */
  padding: 1rem; 
}

.footer-wrapper.sticky .footer {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  
  /* Styling agar terlihat menyatu dengan bawah layar */
  border-radius: 1.5rem 1.5rem 0 0; 
  z-index: 1000;
  
  /* Menerapkan animasi saat kelas ini ditambahkan */
  animation: slideUpFadeIn 0.5s ease-out forwards;

  /* Agar padding-nya tetap bagus di layar penuh */
  box-sizing: border-box;
}

@keyframes slideUpFadeIn {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* Global Utility Classes */
.card {
  background: white;
  border-radius: 1.5rem;
  box-shadow: var(--card-shadow);
  padding: 2rem;
  transition: all var(--transition-speed);
  border: 1px solid rgba(158, 216, 219, 0.1);
  position: relative;
  overflow: hidden;
}

.card:hover {
  transform: translateY(-5px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
}

.card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: var(--gradient-accent);
  opacity: 0;
  transition: opacity var(--transition-speed);
}

.card:hover::before {
  opacity: 1;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 2rem;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-speed);
  position: relative;
  overflow: hidden;
  font-size: 1rem;
}

.btn-primary {
  background: var(--gradient-primary);
  color: white;
}

.btn-error {
  background: var(--gradient-accent);
  color: white;
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}

.error {
  color: var(--error-color);
  padding: 1rem;
  border-radius: 0.375rem;
  background-color: #fee2e2;
  margin: 1rem 0;
}
</style>
