import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'EmberChamber',
  description: 'Invite-only encrypted messaging for trusted circles.',
  cleanUrls: true,
  head: [
    ['meta', { name: 'theme-color', content: '#ea580c' }],
  ],
  themeConfig: {
    logo: { src: '/logo.svg', alt: 'EmberChamber' },
    siteTitle: 'EmberChamber Wiki',
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Getting Started', link: '/getting-started' },
      { text: 'Architecture', link: '/architecture' },
      {
        text: 'Surfaces',
        items: [
          { text: 'Relay', link: '/relay' },
          { text: 'Mobile', link: '/mobile' },
          { text: 'Desktop', link: '/desktop' },
          { text: 'Web', link: '/web' },
        ],
      },
      { text: 'Security', link: '/privacy-security' },
      { text: 'Roadmap', link: '/roadmap' },
    ],
    sidebar: [
      {
        text: 'Overview',
        items: [
          { text: 'What is EmberChamber?', link: '/' },
          { text: 'Getting Started', link: '/getting-started' },
          { text: 'Contributing', link: '/contributing' },
        ],
      },
      {
        text: 'Architecture',
        items: [
          { text: 'System Architecture', link: '/architecture' },
          { text: 'Relay', link: '/relay' },
        ],
      },
      {
        text: 'Client Surfaces',
        items: [
          { text: 'Mobile (Android)', link: '/mobile' },
          { text: 'Desktop', link: '/desktop' },
          { text: 'Web', link: '/web' },
        ],
      },
      {
        text: 'Product',
        items: [
          { text: 'Privacy & Security', link: '/privacy-security' },
          { text: 'Roadmap', link: '/roadmap' },
          { text: 'Operator Playbook', link: '/operator-playbook' },
        ],
      },
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/jhwodchuck/EmberChamber' },
    ],
    editLink: {
      pattern: 'https://github.com/jhwodchuck/EmberChamber/edit/main/docs/wiki-site/:path',
      text: 'Edit this page on GitHub',
    },
    footer: {
      message: 'Invite-only beta · Adults only · Private by design.',
      copyright: '© 2025–2026 EmberChamber',
    },
  },
})
