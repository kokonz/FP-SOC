<script setup lang="ts">
// No imports needed
</script>

<template>
  <div class="app">
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

    <main class="main-content">
      <router-view></router-view>
    </main>

    <footer class="footer">
      <p>&copy; 2025 IP Investigation System</p>
    </footer>
  </div>
</template>

<style>
:root {
  /* Color Variables */
  --primary-color: #2563eb;
  --secondary-color: #3b82f6;
  --success-color: #22c55e;
  --warning-color: #f59e0b;
  --error-color: #ef4444;
  --info-color: #3b82f6;
  
  /* Background Colors */
  --background-color: #f8fafc;
  --surface-color: #ffffff;
  
  /* Text Colors */
  --text-primary: #1e293b;
  --text-secondary: #475569;
  --text-muted: #94a3b8;
  
  /* Border Colors */
  --border-color: #e2e8f0;
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

.navbar {
  background-color: var(--surface-color);
  padding: 1rem 2rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.navbar-brand h1 {
  margin: 0;
  font-size: 1.5rem;
  color: var(--primary-color);
}

.nav-links {
  display: flex;
  gap: 2rem;
}

.nav-link {
  text-decoration: none;
  color: var(--text-secondary);
  font-weight: 500;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  transition: all 0.2s;
}

.nav-link:hover {
  color: var(--primary-color);
  background-color: var(--background-color);
}

.nav-link.router-link-active {
  color: var(--primary-color);
  background-color: var(--background-color);
}

.main-content {
  flex: 1;
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}

.footer {
  background-color: var(--surface-color);
  padding: 1rem;
  text-align: center;
  color: var(--text-muted);
  border-top: 1px solid var(--border-color);
}

/* Global Utility Classes */
.card {
  background: var(--surface-color);
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn-error {
  background: var(--error-color);
  color: white;
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
