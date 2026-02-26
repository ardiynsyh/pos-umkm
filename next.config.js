// next.config.js
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/outlets',
        destination: '/tenants',
        permanent: true, // 308 redirect, SEO-friendly
      },
    ];
  },
};

module.exports = nextConfig;