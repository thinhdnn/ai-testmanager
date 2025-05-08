/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Enable if needed
    // serverActions: true,
  },
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      "handlebars/runtime": "handlebars/dist/cjs/handlebars.runtime",
      handlebars: "handlebars/dist/cjs/handlebars",
    };

    return config;
},
}

module.exports = nextConfig 