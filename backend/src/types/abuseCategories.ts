export interface AbuseCategory {
  id: number;
  title: string;
  description: string;
}

export const abuseCategories: { [key: number]: AbuseCategory } = {
  1: {
    id: 1,
    title: 'DNS Compromise',
    description: 'Altering DNS records resulting in improper redirection.'
  },
  2: {
    id: 2,
    title: 'DNS Poisoning',
    description: 'Falsifying domain server cache (cache poisoning).'
  },
  3: {
    id: 3,
    title: 'Fraud Orders',
    description: 'Fraudulent orders.'
  },
  4: {
    id: 4,
    title: 'DDoS Attack',
    description: 'Participating in distributed denial-of-service (usually part of botnet).'
  },
  5: {
    id: 5,
    title: 'FTP Brute-Force',
    description: 'FTP Brute-Force attacks.'
  },
  6: {
    id: 6,
    title: 'Ping of Death',
    description: 'Oversized IP packet.'
  },
  7: {
    id: 7,
    title: 'Phishing',
    description: 'Phishing websites and/or email.'
  },
  8: {
    id: 8,
    title: 'Fraud VoIP',
    description: 'VoIP fraud attempts.'
  },
  9: {
    id: 9,
    title: 'Open Proxy',
    description: 'Open proxy, open relay, or Tor exit node.'
  },
  10: {
    id: 10,
    title: 'Web Spam',
    description: 'Comment/forum spam, HTTP referer spam, or other CMS spam.'
  },
  11: {
    id: 11,
    title: 'Email Spam',
    description: 'Spam email content, infected attachments, and phishing emails.'
  },
  12: {
    id: 12,
    title: 'Blog Spam',
    description: 'CMS blog comment spam.'
  },
  13: {
    id: 13,
    title: 'VPN IP',
    description: 'Conjunctive category.'
  },
  14: {
    id: 14,
    title: 'Port Scan',
    description: 'Scanning for open ports and vulnerable services.'
  },
  15: {
    id: 15,
    title: 'Hacking',
    description: 'Hacking attempts.'
  },
  16: {
    id: 16,
    title: 'SQL Injection',
    description: 'Attempts at SQL injection.'
  },
  17: {
    id: 17,
    title: 'Spoofing',
    description: 'Email sender spoofing.'
  },
  18: {
    id: 18,
    title: 'Brute-Force',
    description: 'Credential brute-force attacks on webpage logins and services.'
  },
  19: {
    id: 19,
    title: 'Bad Web Bot',
    description: 'Webpage scraping and malicious crawlers.'
  },
  20: {
    id: 20,
    title: 'Exploited Host',
    description: 'Host is likely infected with malware.'
  },
  21: {
    id: 21,
    title: 'Web App Attack',
    description: 'Attempts to probe for or exploit installed web applications.'
  },
  22: {
    id: 22,
    title: 'SSH',
    description: 'Secure Shell (SSH) abuse.'
  },
  23: {
    id: 23,
    title: 'IoT Targeted',
    description: 'Abuse was targeted at an "Internet of Things" type device.'
  }
};